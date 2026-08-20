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
  {
    id: 'dubai-eye',
    name: 'Dubai Eye 103.8',
    frequency: '103.8',
    frequencyNum: 103.8,
    category: 'News, Talk & Sports',
    streamUrl: 'https://gbradio.cdn.tibus.net/U105?aw_0_1st.playerId=wireless-website',
    fallbackUrls: [
      'https://stream.arn.ae/dubaieye',
    ],
    isFavorite: true,
  },
  {
    id: 'shj-radio',
    name: 'Sharjah Radio',
    frequency: '94.4',
    frequencyNum: 94.4,
    category: 'Sharjah Culture & Talk',
    streamUrl: 'https://l3.itworkscdn.net/smcsharjahlive/sharjahradiolive/icecast.audio',
    fallbackUrls: [
      'https://stream.zeno.fm/g6t5r21d3heuv',
    ],
    isFavorite: true,
  },
  {
    id: 'virgin-dubai',
    name: 'Virgin Radio Dubai',
    frequency: '104.4',
    frequencyNum: 104.4,
    category: 'Top 40 & Pop Hits',
    streamUrl: 'https://radio.virginradio.co.uk/stream',
    isFavorite: true,
  },
  {
    id: 'radio-mirchi',
    name: 'Radio Mirchi UAE',
    frequency: '102.4',
    frequencyNum: 102.4,
    category: 'Bollywood & Desi Hits',
    streamUrl: 'https://eu8.fastcast4u.com/proxy/clyedupq?mp=/1',
    isFavorite: false,
  },
  {
    id: 'dubai-dj',
    name: 'DJ Radio Dubai',
    frequency: '92.0',
    frequencyNum: 92.0,
    category: 'Dance & Electronic Hits',
    streamUrl: 'https://listen.radioking.com/radio/623812/stream/685903',
    isFavorite: false,
  },
];
