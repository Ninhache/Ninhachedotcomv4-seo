// Use type safe message keys with `next-intl`
type Messages = typeof import('./app/_translations/en-US.json');
declare interface IntlMessages extends Messages {}
