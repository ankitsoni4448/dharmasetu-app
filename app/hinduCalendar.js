// hinduCalendar.js — Hindu festival and Ekadashi data
// This is a DATA module, not a screen. Default export prevents Expo Router warning.

export const FESTIVALS_2025_2026 = [
  { name: 'Makar Sankranti', date: '2025-01-14', deity: 'Surya', type: 'festival' },
  { name: 'Basant Panchami', date: '2025-02-02', deity: 'Saraswati', type: 'festival' },
  { name: 'Mahashivaratri', date: '2025-02-26', deity: 'Shiva', type: 'festival' },
  { name: 'Holi', date: '2025-03-14', deity: 'Krishna', type: 'festival' },
  { name: 'Gudi Padwa / Ugadi', date: '2025-03-30', deity: 'Brahma', type: 'festival' },
  { name: 'Ram Navami', date: '2025-04-06', deity: 'Ram', type: 'festival' },
  { name: 'Hanuman Jayanti', date: '2025-04-12', deity: 'Hanuman', type: 'festival' },
  { name: 'Akshaya Tritiya', date: '2025-04-30', deity: 'Vishnu', type: 'festival' },
  { name: 'Buddha Purnima', date: '2025-05-12', deity: 'Vishnu', type: 'festival' },
  { name: 'Guru Purnima', date: '2025-07-10', deity: 'Guru', type: 'festival' },
  { name: 'Nag Panchami', date: '2025-07-29', deity: 'Shiva', type: 'festival' },
  { name: 'Raksha Bandhan', date: '2025-08-09', deity: 'Vishnu', type: 'festival' },
  { name: 'Janmashtami', date: '2025-08-16', deity: 'Krishna', type: 'festival' },
  { name: 'Ganesh Chaturthi', date: '2025-08-27', deity: 'Ganesh', type: 'festival' },
  { name: 'Navratri (Sharad) Start', date: '2025-10-02', deity: 'Durga', type: 'festival' },
  { name: 'Dussehra (Vijayadashami)', date: '2025-10-02', deity: 'Ram/Durga', type: 'festival' },
  { name: 'Diwali', date: '2025-10-20', deity: 'Lakshmi', type: 'festival' },
  { name: 'Chhath Puja', date: '2025-10-28', deity: 'Surya', type: 'festival' },
  { name: 'Kartik Purnima', date: '2025-11-05', deity: 'Vishnu', type: 'festival' },
  { name: 'Makar Sankranti', date: '2026-01-14', deity: 'Surya', type: 'festival' },
];

export const EKADASHI_2025_2026 = [
  { name: 'Putrada Ekadashi', date: '2025-01-10' },
  { name: 'Shattila Ekadashi', date: '2025-01-25' },
  { name: 'Jaya Ekadashi', date: '2025-02-08' },
  { name: 'Vijaya Ekadashi', date: '2025-02-24' },
  { name: 'Amalaki Ekadashi', date: '2025-03-11' },
  { name: 'Papamochani Ekadashi', date: '2025-03-25' },
  { name: 'Kamada Ekadashi', date: '2025-04-09' },
  { name: 'Varuthini Ekadashi', date: '2025-04-24' },
  { name: 'Mohini Ekadashi', date: '2025-05-08' },
  { name: 'Apara Ekadashi', date: '2025-05-23' },
  { name: 'Nirjala Ekadashi', date: '2025-06-06' },
  { name: 'Yogini Ekadashi', date: '2025-06-22' },
  { name: 'Devshayani Ekadashi', date: '2025-07-06' },
  { name: 'Kamika Ekadashi', date: '2025-07-21' },
  { name: 'Shravana Putrada Ekadashi', date: '2025-08-05' },
  { name: 'Aja Ekadashi', date: '2025-08-19' },
  { name: 'Parsva Ekadashi', date: '2025-09-03' },
  { name: 'Indira Ekadashi', date: '2025-09-19' },
  { name: 'Papankusha Ekadashi', date: '2025-10-03' },
  { name: 'Rama Ekadashi', date: '2025-10-18' },
  { name: 'Devutthana Ekadashi', date: '2025-11-01' },
  { name: 'Utpanna Ekadashi', date: '2025-11-16' },
  { name: 'Mokshada Ekadashi', date: '2025-12-01' },
  { name: 'Saphala Ekadashi', date: '2025-12-16' },
];

// Default export required by Expo Router (prevents "missing default export" warning)
// This component is never rendered as a screen — import the data directly
export default function HinduCalendarData() { return null; }