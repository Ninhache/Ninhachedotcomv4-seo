// `/fr/admin` and `/en/admin` are the honeypot too. The real back-office is
// the root `/admin` app, outside the locale segment.
export { default, generateMetadata } from '../wp-admin/page';
