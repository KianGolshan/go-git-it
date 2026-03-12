import { delayRender, continueRender } from 'remotion';
import { loadFont as loadInstrumentSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadDMSans } from '@remotion/google-fonts/DMSans';
import { loadFont as loadDMMono } from '@remotion/google-fonts/DMMono';

export function loadFonts(): { waitForFonts: () => void } {
  const handle = delayRender('Loading Google Fonts');

  const promises = [
    loadInstrumentSerif(),
    loadDMSans(),
    loadDMMono(),
  ];

  Promise.all(promises).then(() => {
    continueRender(handle);
  }).catch((err) => {
    console.error('Font loading error:', err);
    continueRender(handle);
  });

  return {
    waitForFonts: () => {
      // fonts are loading; delayRender handles synchronization
    },
  };
}
