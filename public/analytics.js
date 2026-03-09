(() => {
  'use strict';

  class AnalyticsClient {
    constructor() {
      this.currentScript = document.currentScript;
      this.oneDayInMs = 24 * 60 * 60 * 1000;
      this.analyticsStateKey = 'troop_analytics_state';
    }

    resolveEndpoint() {
      if (this.currentScript?.src) {
        return new URL('/data', this.currentScript.src).toString();
      }

      return '/data';
    }

    async send(payload) {
      const payloadToSend = payload || this.collectDefaultPayload();
      if (
        !payloadToSend ||
        typeof payloadToSend !== 'object' ||
        Array.isArray(payloadToSend)
      ) {
        throw new Error('A JSON object payload is required.');
      }

      const endpoint = this.resolveEndpoint();
      const headers = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadToSend),
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(
          `Analytics request failed with status ${response.status}`,
        );
      }

      return response.json();
    }

    parseScriptPayload() {
      if (!this.currentScript) {
        return {};
      }

      const jsonText = this.currentScript.getAttribute('data-json');
      if (!jsonText) {
        return {};
      }

      try {
        const parsed = JSON.parse(jsonText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return {};
        }
        return parsed;
      } catch (error) {
        return {};
      }
    }

    addBodyThemeAttributes(payload) {
      const themeVersion = document.body?.getAttribute('data-theme-version');
      const themeName = document.body?.getAttribute('data-theme-name');
      const themePreset = document.body?.getAttribute('data-theme-preset');

      if (!themeVersion && !themeName && !themePreset) {
        return payload;
      }

      if (
        !payload.theme ||
        typeof payload.theme !== 'object' ||
        Array.isArray(payload.theme)
      ) {
        payload.theme = {};
      }

      if (themeVersion) {
        payload.theme.version = themeVersion;
      }

      if (themeName) {
        payload.theme.name = themeName;
      }

      if (themePreset) {
        payload.theme.preset = themePreset;
      }

      return payload;
    }

    normalizeShopifyId(value) {
      if (value === undefined || value === null) {
        return value;
      }

      const asString = String(value).trim();
      return asString || null;
    }

    addShopifyIds(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return payload;
      }

      if (
        payload.store &&
        typeof payload.store === 'object' &&
        !Array.isArray(payload.store)
      ) {
        payload.store.shopify_id = this.normalizeShopifyId(
          payload.store.shopify_id ?? payload.store.id,
        );
      }

      if (
        payload.theme &&
        typeof payload.theme === 'object' &&
        !Array.isArray(payload.theme)
      ) {
        payload.theme.shopify_id = this.normalizeShopifyId(
          payload.theme.shopify_id ?? payload.theme.id,
        );
      }

      return payload;
    }

    collectDefaultPayload() {
      const basePayload = this.parseScriptPayload();
      this.addBodyThemeAttributes(basePayload);
      return this.addShopifyIds(basePayload);
    }

    hasRequiredPayloadFields(payload) {
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return false;
      }

      const merchantEmail = payload.merchant?.email;
      const storeId = payload.store?.shopify_id ?? payload.store?.id;
      const storeDomain = payload.store?.domain;
      const themeId = payload.theme?.shopify_id ?? payload.theme?.id;

      return Boolean(merchantEmail && storeId && storeDomain && themeId);
    }

    getStoredState() {
      try {
        const rawValue = window.localStorage.getItem(this.analyticsStateKey);
        if (!rawValue) {
          return {};
        }

        const parsedValue = JSON.parse(rawValue);
        if (
          !parsedValue ||
          typeof parsedValue !== 'object' ||
          Array.isArray(parsedValue)
        ) {
          return {};
        }

        return parsedValue;
      } catch (error) {
        return {};
      }
    }

    setStoredState(state) {
      try {
        window.localStorage.setItem(
          this.analyticsStateKey,
          JSON.stringify(state),
        );
      } catch (error) {
        // Intentionally silent in storefront context.
      }
    }

    hasSentInLastDay(storedState) {
      const lastSentAt = Number(storedState.lastSentAt);
      if (!Number.isFinite(lastSentAt)) {
        return false;
      }

      return Date.now() - lastSentAt < this.oneDayInMs;
    }

    hasThemeRoleChanged(currentRole, storedState) {
      const lastThemeRole =
        typeof storedState.lastThemeRole === 'string'
          ? storedState.lastThemeRole
          : '';
      return lastThemeRole !== currentRole;
    }

    async autoRun() {
      const payload = this.collectDefaultPayload();
      if (!this.hasRequiredPayloadFields(payload)) {
        return;
      }

      const currentThemeRole =
        typeof payload.theme?.role === 'string' ? payload.theme.role : '';
      if (currentThemeRole === 'development') {
        return;
      }

      const storedState = this.getStoredState();
      const themeRoleChanged = this.hasThemeRoleChanged(
        currentThemeRole,
        storedState,
      );

      if (!themeRoleChanged && this.hasSentInLastDay(storedState)) {
        return;
      }

      try {
        await this.send(payload);
        this.setStoredState({
          lastSentAt: Date.now(),
          lastThemeRole: currentThemeRole,
        });
      } catch (error) {
        // Intentionally silent in storefront context.
      }
    }
  }

  const analyticsClient = new AnalyticsClient();
  void analyticsClient.autoRun();
})();
