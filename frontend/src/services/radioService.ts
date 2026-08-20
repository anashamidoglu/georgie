export interface RadioStation {
  id: string;
  name: string;
  frequency: string; // e.g. "102.7"
  frequencyNum: number;
  category: string;
  streamUrl: string;
  fallbackUrls?: string[];
  isFavorite?: boolean;
}

export const DEFAULT_RADIO_STATIONS: RadioStation[] = [
  {
    id: 'shj-quran',
    name: 'Sharjah Quran Radio',
    frequency: '102.7',
    frequencyNum: 102.7,
    category: 'Holy Quran & Recitations',
    streamUrl: 'https://l3.itworkscdn.net/smcquranlive/quranradiolive/icecast.audio',
    fallbackUrls: [
      'https://n09.radiojar.com/0tpy1h0kxtzuv',
      'https://radio.mp3islam.com/listen/abdulbasit/radio.mp3',
    ],
    isFavorite: true,
  },
];
