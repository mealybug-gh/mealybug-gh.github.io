# randomCollector (ncrypt-random-collector)

Modern browsers usually support `crypto.getRandomValues` or `msCrypto.getRandomValues` to obtain
cryptographically random data.

NodeJS has the global `crypto` offering the method `crypto.randomBytes`.

In browser, if `getRandomValues` is either not available or not trusted,
collecting random values from a users mouse or touch moves is possible just
as well.

However, all these ways are not really compatible to each other and need to
be implemented on their own. **randomCollector** tries to provide a **simple
interface for collecting random data both in browser and NodeJS**.
