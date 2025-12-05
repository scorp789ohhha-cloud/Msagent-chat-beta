

(function () {
  function extractYouTubeIdMaybe(urlOrId) {
    if (!urlOrId) return null;
    const s = urlOrId.trim();

    // If it looks like a bare 11-char id
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;

    const re = [
      /[?&]v=([A-Za-z0-9_-]{11})/,
      /youtu\.be\/([A-Za-z0-9_-]{11})/,
      /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
      /\/v\/([A-Za-z0-9_-]{11})/
    ];

    for (let r of re) {
      const m = s.match(r);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  function makeYoutubeIframe(id, width = 560, height = 315) {
    const iframe = document.createElement('iframe');
    iframe.width = String(width);
    iframe.height = String(height);
    iframe.src = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    iframe.frameBorder = '0';
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    iframe.setAttribute('allowfullscreen', '');
    return iframe;
  }

  function renderYoutubeMessageLocally(payload) {
    if (!window.addChatMessage) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-msg chat-youtube';
    wrapper.appendChild(makeYoutubeIframe(payload.id, 560, 315));
    window.addChatMessage(wrapper);
  }

  window.handleOutgoingMessageWithYouTube = function (text) {
    if (!text) return;
    const trimmed = text.trim();
    if (trimmed.toLowerCase().startsWith('/youtube')) {
      const parts = trimmed.split(/\s+/, 2);
      const arg = (parts.length > 1) ? parts[1] : '';
      const id = extractYouTubeIdMaybe(arg);

      if (!id) {
        const err = document.createElement('div');
        err.className = 'chat-error';
        err.textContent = 'Invalid YouTube id or URL. Use: /youtube VIDEO_ID or /youtube https://youtu.be/VIDEO_ID';
        if (window.addChatMessage) window.addChatMessage(err);
        return;
      }

      const payload = { type: 'youtube', id: id, ts: Date.now() };

      if (window.socket && socket.emit) {
        socket.emit('chat message', payload);
      } else if (window.sendMessage) {
        // fallback: send as JSON string (server handler below tries to parse)
        sendMessage(JSON.stringify(payload));
      }

      // render locally immediately so sender sees it
      renderYoutubeMessageLocally(payload);
      return;
    }

    if (window.sendMessage) {
      sendMessage(text);
    } else if (window.socket && socket.emit) {
      socket.emit('chat message', { type: 'text', text: text, ts: Date.now() });
    }
  };

  if (window.socket && socket.on) {
    socket.on('chat message', function (msg) {
      try {
        if (typeof msg === 'string') {
          msg = JSON.parse(msg);
        }
      } catch (e) {
      }

      if (msg && msg.type === 'youtube' && msg.id) {
        const wrapper = document.createElement('div');
        wrapper.className = 'chat-msg chat-youtube';
        wrapper.appendChild(makeYoutubeIframe(msg.id, 560, 315));
        if (window.addChatMessage) window.addChatMessage(wrapper);
        return;
      }

      // otherwise delegate to existing incoming logic
      if (window.handleIncomingMessage) {
        window.handleIncomingMessage(msg);
      }
    });
  }
})();
