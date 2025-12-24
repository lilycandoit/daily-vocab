// Offscreen script to handle audio playback
// This runs in a separate context from the webpage, bypassing CSP restrictions

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.target !== 'offscreen') return;

  if (message.action === 'play-audio') {
    playAudio(message.audioUrl);
  }
});

function playAudio(url) {
  if (!url) return;

  const audio = new Audio(url);
  audio.play()
    .then(() => {
      console.log('Audio playing in offscreen document');
    })
    .catch(error => {
      console.error('Offscreen playback error:', error);
    });
}
