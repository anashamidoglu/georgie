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
    streamUrl: 'https://live.mp3quran.net:9992/',
    fallbackUrls: [
      'https://stream.zeno.fm/4e48b87n22zuv',
      'https://qurany.net/live',
    ],
    isFavorite: true,
  },
  {
    id: 'dubai-eye',
    name: 'Dubai Eye 103.8',
    frequency: '103.8',
    frequencyNum: 103.8,
    category: 'News, Talk & Sports',
    streamUrl: 'https://icecast.arn.ae/dubaieye.mp3',
    fallbackUrls: [
      'https://dubaieye.arn.ae/stream',
    ],
    isFavorite: true,
  },
  {
    id: 'shj-radio',
    name: 'Sharjah Radio',
    frequency: '94.4',
    frequencyNum: 94.4,
    category: 'Sharjah Culture & Talk',
    streamUrl: 'https://stream.zeno.fm/g6t5r21d3heuv',
    fallbackUrls: [
      'https://radios.smc.ae/sharjah',
    ],
    isFavorite: true,
  },
  {
    id: 'virgin-dubai',
    name: 'Virgin Radio Dubai',
    frequency: '104.4',
    frequencyNum: 104.4,
    category: 'Top 40 & Pop Hits',
    streamUrl: 'https://icecast.arn.ae/virgin.mp3',
    fallbackUrls: [
      'https://virginradio.arn.ae/stream',
    ],
    isFavorite: true,
  },
  {
    id: 'dubai-92',
    name: 'Dubai 92',
    frequency: '92.0',
    frequencyNum: 92.0,
    category: 'Classic Hits & 80s/90s',
    streamUrl: 'https://icecast.arn.ae/dubai92.mp3',
    isFavorite: true,
  },
  {
    id: 'channel-4',
    name: 'Channel 4 FM',
    frequency: '104.8',
    frequencyNum: 104.8,
    category: 'Contemporary Pop Hits',
    streamUrl: 'https://stream.channel4mediagroup.com/channel4',
    isFavorite: false,
  },
  {
    id: 'al-rabia',
    name: 'Al Rabia FM',
    frequency: '107.8',
    frequencyNum: 107.8,
    category: 'Arabic Hits',
    streamUrl: 'https://stream.channel4mediagroup.com/alrabia',
    isFavorite: false,
  },
  {
    id: 'radio-1-uae',
    name: 'Radio 1 UAE',
    frequency: '104.1',
    frequencyNum: 104.1,
    category: 'Dance & Top 40',
    streamUrl: 'https://stream.adradio.ae/radio1',
    isFavorite: false,
  },
  {
    id: 'radio-2-uae',
    name: 'Radio 2 UAE',
    frequency: '99.3',
    frequencyNum: 99.3,
    category: 'Classic Rock & Hits',
    streamUrl: 'https://stream.adradio.ae/radio2',
    isFavorite: false,
  },
  {
    id: 'radio-mirchi',
    name: 'Radio Mirchi UAE',
    frequency: '102.4',
    frequencyNum: 102.4,
    category: 'Bollywood & Desi Hits',
    streamUrl: 'https://radiomirchi.stream/live',
    isFavorite: false,
  },
];
