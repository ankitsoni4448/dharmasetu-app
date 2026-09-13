const BASE_URL = (process.env.EXPO_PUBLIC_MANTRA_AUDIO_BASE_URL || '').replace(/\/$/, '');

export const MANTRA_AUDIO_FILES = {
  gayatri: 'gayatri.mp3', mahamrityunjaya: 'mahamrityunjaya.mp3', om_namah_shivay: 'om_namah_shivay.mp3',
  shiva_panchakshara: 'shiva_panchakshara.mp3', om_namo_narayanaya: 'om_namo_narayanaya.mp3',
  om_namo_bhagavate: 'om_namo_bhagavate.mp3', vishnu_sahasranama_seed: 'vishnu_sahasranama_seed.mp3',
  hare_krishna: 'hare_krishna.mp3', krishna_beej: 'krishna_beej.mp3', hanuman_beej: 'hanuman_beej.mp3',
  hanuman_moola: 'hanuman_moola.mp3', bajrang_baan_seed: 'bajrang_baan_seed.mp3', ganesh_moola: 'ganesh_moola.mp3',
  ganesh_beej: 'ganesh_beej.mp3', vakratunda: 'vakratunda.mp3', saraswati_beej: 'saraswati_beej.mp3',
  lakshmi_beej: 'lakshmi_beej.mp3', durga_moola: 'durga_moola.mp3', kali_mantra: 'kali_mantra.mp3',
  surya_moola: 'surya_moola.mp3', aditya_hridaya_seed: 'aditya_hridaya_seed.mp3', ram_taraka: 'ram_taraka.mp3',
  ram_moola: 'ram_moola.mp3', shanti_mantra: 'shanti_mantra.mp3', om_namah: 'om_namah.mp3',
  asato_ma: 'asato_ma.mp3', shiv_beej: 'shiv_beej.mp3', sudarshana: 'sudarshana.mp3',
  baglamukhi_seed: 'baglamukhi_seed.mp3',
};

export function getMantraAudioSource(audioKey) {
  const filename = MANTRA_AUDIO_FILES[audioKey];
  return BASE_URL && filename ? { uri: `${BASE_URL}/${filename}` } : null;
}
