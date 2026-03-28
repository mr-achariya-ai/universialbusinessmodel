const config = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const statusEl = document.getElementById('status');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const localSignal = document.getElementById('localSignal');
const remoteSignal = document.getElementById('remoteSignal');
const chatLog = document.getElementById('chatLog');
const chatInput = document.getElementById('chatInput');

const startMediaBtn = document.getElementById('startMediaBtn');
const createOfferBtn = document.getElementById('createOfferBtn');
const createAnswerBtn = document.getElementById('createAnswerBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const toggleVideoBtn = document.getElementById('toggleVideoBtn');
const copyLocalSignalBtn = document.getElementById('copyLocalSignalBtn');
const applyRemoteSignalBtn = document.getElementById('applyRemoteSignalBtn');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');

let pc;
let localStream;
let dataChannel;
let pendingIceCandidates = [];

function setStatus(text) {
  statusEl.textContent = `Status: ${text}`;
}

function appendMessage(author, text) {
  const p = document.createElement('p');
  p.className = 'msg';
  p.innerHTML = `<strong>${author}:</strong> ${text}`;
  chatLog.appendChild(p);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function ensurePeerConnection() {
  if (pc) return;

  pc = new RTCPeerConnection(config);

  pc.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  pc.oniceconnectionstatechange = () => {
    setStatus(`ICE ${pc.iceConnectionState}`);
  };

  pc.onicecandidate = (event) => {
    if (!event.candidate) {
      updateLocalSignalBox();
      return;
    }
    pendingIceCandidates.push(event.candidate.toJSON());
    updateLocalSignalBox();
  };

  pc.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
  };

  if (localStream) {
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
  }
}

function updateLocalSignalBox() {
  if (!pc?.localDescription) return;

  const payload = {
    description: pc.localDescription,
    candidates: pendingIceCandidates,
  };

  localSignal.value = JSON.stringify(payload, null, 2);
}

function setupDataChannel() {
  if (!dataChannel) return;

  dataChannel.onopen = () => {
    appendMessage('System', 'Data channel open. You can chat now.');
    sendBtn.disabled = false;
  };

  dataChannel.onclose = () => {
    appendMessage('System', 'Data channel closed.');
    sendBtn.disabled = true;
  };

  dataChannel.onmessage = (event) => {
    appendMessage('Remote', event.data);
  };
}

startMediaBtn.addEventListener('click', async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
    ensurePeerConnection();

    createOfferBtn.disabled = false;
    createAnswerBtn.disabled = false;
    toggleAudioBtn.disabled = false;
    toggleVideoBtn.disabled = false;
    setStatus('media ready');
  } catch (error) {
    console.error(error);
    setStatus('media access denied or unavailable');
  }
});

createOfferBtn.addEventListener('click', async () => {
  ensurePeerConnection();
  dataChannel = pc.createDataChannel('chat');
  setupDataChannel();

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  pendingIceCandidates = [];
  updateLocalSignalBox();
  setStatus('offer created; copy local signal to remote peer');
});

createAnswerBtn.addEventListener('click', async () => {
  ensurePeerConnection();

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  pendingIceCandidates = [];
  updateLocalSignalBox();
  setStatus('answer created; copy local signal back to offer peer');
});

applyRemoteSignalBtn.addEventListener('click', async () => {
  try {
    ensurePeerConnection();

    const parsed = JSON.parse(remoteSignal.value);
    if (!parsed.description) {
      throw new Error('Missing description in signal payload.');
    }

    await pc.setRemoteDescription(parsed.description);

    if (Array.isArray(parsed.candidates)) {
      for (const candidate of parsed.candidates) {
        await pc.addIceCandidate(candidate);
      }
    }

    setStatus(`remote ${parsed.description.type} applied`);
  } catch (error) {
    console.error(error);
    setStatus(`failed to apply remote signal: ${error.message}`);
  }
});

copyLocalSignalBtn.addEventListener('click', async () => {
  if (!localSignal.value) return;
  await navigator.clipboard.writeText(localSignal.value);
  setStatus('local signal copied to clipboard');
});

toggleAudioBtn.addEventListener('click', () => {
  if (!localStream) return;
  const [audioTrack] = localStream.getAudioTracks();
  if (!audioTrack) return;
  audioTrack.enabled = !audioTrack.enabled;
  toggleAudioBtn.textContent = audioTrack.enabled ? 'Mute Audio' : 'Unmute Audio';
});

toggleVideoBtn.addEventListener('click', () => {
  if (!localStream) return;
  const [videoTrack] = localStream.getVideoTracks();
  if (!videoTrack) return;
  videoTrack.enabled = !videoTrack.enabled;
  toggleVideoBtn.textContent = videoTrack.enabled ? 'Turn Video Off' : 'Turn Video On';
});

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();
  if (!text || !dataChannel || dataChannel.readyState !== 'open') return;

  dataChannel.send(text);
  appendMessage('You', text);
  chatInput.value = '';
});
