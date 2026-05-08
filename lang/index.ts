import cs from './cs'
import en from './en'
import ru from './ru'
import uk from './uk'

export const messages = {
  en,
  ru,
  uk,
  cs
}

export type TgLocaleCode = keyof typeof messages
