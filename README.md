# <img src="public/pwa-192x192.png" alt="TickyTock" height="48px" align="center"> TickyTock

[![Netlify Status](https://api.netlify.com/api/v1/badges/a4c4d0cc-4c3c-4d17-98fb-bccd12d732ac/deploy-status)](https://app.netlify.com/projects/tickytock/deploys)

**Live App**: https://tickytock.netlify.app/

A simple personal time tracker based on my fond memories of using Hamster Time Tracker back in 2013.

Built with Claude.

All your data stays private in your browser, using [@mrbelloc/encrypted-pouch](https://github.com/pablolb/encrypted-pouch) (a straight-forward "plain in-memory store, data is encrypted before written to disk" approach I've been using in personal projects).

This is a work in progress!

## Tech Stack

- **Svelte 5** (runes) + TypeScript
- **PouchDB** for local storage
- **[@mrbelloc/encrypted-pouch](https://github.com/pablolb/encrypted-pouch)** for encryption
- **[Tabler UI](https://tabler.io/)** for components
- **Vite** for build

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Data flow, reactive patterns, and architecture details
- **[AGENTS.md](./AGENTS.md)** - AI agent guide with patterns, anti-patterns, and Tabler UI usage

## Development

```bash
npm install
npm run dev
```

## UI Development

This project uses [Tabler UI](https://tabler.io/) - avoid custom CSS/JS unless absolutely necessary.

**Tabler Documentation:**

- [Overview](https://docs.tabler.io/ui)
- [Components](https://docs.tabler.io/ui/components)
- [Forms](https://docs.tabler.io/ui/forms)
- [Layout](https://docs.tabler.io/ui/layout)

## License

MIT
