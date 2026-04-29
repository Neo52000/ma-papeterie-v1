# Sentry — observabilité erreurs prod

Capture les erreurs JavaScript côté client + serveur (SSR Astro/Netlify
Functions). Free tier = 5 000 erreurs/mois.

## Variables d'environnement

### Netlify (Site settings → Environment variables)

| Var                 | Valeur                                                                       | Notes                                                                              |
| ------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `PUBLIC_SENTRY_DSN` | `https://5c921bc6...@o4511302638960640.ingest.de.sentry.io/4511303554564176` | DSN obtenu sur Sentry → Settings → Projects → ma-papeterie-web → Client Keys (DSN) |
| `SENTRY_AUTH_TOKEN` | _(optionnel V1)_                                                             | Pour upload des sourcemaps. Sentry → Settings → Auth Tokens. Skip pour démarrer.   |

> **Note** : le DSN n'est pas un secret strict (il finit dans le bundle JS
> client). On le préfixe `PUBLIC_` pour qu'Astro l'expose au client.

### Sans `PUBLIC_SENTRY_DSN` configuré

L'intégration Sentry est désactivée — pas de telemetry, pas d'erreur de
build, le site fonctionne normalement. Utile pour le dev local.

## Activation

1. Ajoute `PUBLIC_SENTRY_DSN` aux env vars Netlify
2. Redéploie le site (push ou trigger manuel via Netlify UI)
3. Vérifie : DevTools → Network → tu dois voir des appels vers
   `*.ingest.de.sentry.io` (sauf si tu utilises un adblocker)
4. Sentry → Issues : les erreurs apparaissent sous 1-2 min

## Test manuel d'erreur

Dans la console navigateur sur le site prod :

```js
throw new Error('Sentry test from console');
```

Recharge Sentry dashboard → l'erreur apparaît.

## Sampling configuré

- `tracesSampleRate: 0.1` — 10 % des transactions tracées (perf monitoring)
- `replaysSessionSampleRate: 0` — pas de session replays par défaut
- `replaysOnErrorSampleRate: 1.0` — replay automatique quand erreur

À ajuster via Sentry UI ou code (`astro.config.mjs`) si trop/pas assez.

## Coût

Free tier = 5 000 events/mois + 50 replays/mois. Dépassement → upgrade
Team ($26/mo) ou filtre les erreurs verbose dans Sentry → Settings →
Inbound Filters.
