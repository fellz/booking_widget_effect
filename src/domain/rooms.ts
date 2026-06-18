import { type Room } from './types'

/** The hotel's three room categories. Static catalogue, same data as the Vue demo. */
export const ROOMS: ReadonlyArray<Room> = [
  {
    id: 'standard',
    capacity: 2,
    pricePerNight: { ru: 4500, en: 49 },
    name: { ru: 'Стандарт', en: 'Standard' },
    description: {
      ru: 'Уютный номер для двоих с одной двуспальной кроватью.',
      en: 'A cosy room for two with one double bed.',
    },
  },
  {
    id: 'comfort',
    capacity: 3,
    pricePerNight: { ru: 6900, en: 75 },
    name: { ru: 'Комфорт', en: 'Comfort' },
    description: {
      ru: 'Просторный номер до трёх гостей с зоной отдыха.',
      en: 'A spacious room for up to three guests with a lounge area.',
    },
  },
  {
    id: 'family',
    capacity: 5,
    pricePerNight: { ru: 9900, en: 109 },
    name: { ru: 'Семейный', en: 'Family' },
    description: {
      ru: 'Большой номер до пяти гостей: две спальни и детская зона.',
      en: 'A large room for up to five guests: two bedrooms and a kids area.',
    },
  },
]
