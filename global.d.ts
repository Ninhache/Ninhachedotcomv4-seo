// Use type safe message keys with `next-intl`
type Messages = typeof import('./app/_translations/en.json')
declare interface IntlMessages extends Messages {}
