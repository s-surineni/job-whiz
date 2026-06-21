import { fillApplication, clearFilledFields } from '../utils/filler';

export default defineContentScript({
  matches: ['https://*/*'],
  allFrames: true,
  runAt: 'document_idle',
  main() {
    chrome.runtime.onMessage.addListener(
      async (message, sender, sendResponse) => {
        if (message.type === 'FILL_JOB_APPLICATION') {
          sendResponse({ status: 'started' });
          await fillApplication();
        }
        if (message.type === 'CLEAR_FIELDS') {
          sendResponse({ status: 'cleared' });
          clearFilledFields();
        }
      },
    );
  },
});