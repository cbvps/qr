import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API = '/api';

function isMobile() {
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

function PCMode() {
  const [sessionId] = useState(uuidv4());
  const [link, setLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/?session=${sessionId}`;

  useEffect(() => {
    const interval = setInterval(async () => {
      const resp = await fetch(`${API}/receive/${sessionId}`);
      if (resp.ok) {
        const data = await resp.json();
        setLink(data.link);
        clearInterval(interval);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <div className="pc-mode">
      <h2>Передача ссылки на ПК</h2>
      <QRCode value={url} size={256} />
      <div className="qr-caption">Отсканируйте код с телефона и отправьте ссылку</div>
      {link && (
        <div className="result">
          <a href={link} target="_blank" rel="noopener noreferrer">{link}</a>
          <button onClick={() => {navigator.clipboard.writeText(link); setCopied(true);}}>Скопировать</button>
          {copied && <span className="copied">Скопировано!</span>}
        </div>
      )}
    </div>
  );
}

function MobileMode() {
  const [session, setSession] = useState(null);
  const [link, setLink] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  // Получаем session из URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSession(params.get('session'));
  }, []);

  // Автозаполнение из буфера
  const fillFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setLink(text);
    } catch {
      setError('Не удалось прочитать буфер обмена');
    }
  };

  // Сканирование QR
  const scanQR = () => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    );
    scanner.render(
      (decoded) => {
        try {
          const url = new URL(decoded);
          const session = url.searchParams.get('session');
          if (session) setSession(session);
        } catch {}
        scanner.clear();
      },
      () => {}
    );
  };

  const send = async () => {
    if (!link || !session) {
      setError('Сессия или ссылка не указаны');
      return;
    }
    setError('');
    const resp = await fetch(`${API}/send`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ session_id: session, link })
    });
    if (resp.ok) setSent(true);
    else setError('Ошибка отправки');
  };

  if (sent) return <div className="sent">Ссылка отправлена!</div>;

  return (
    <div className="mobile-mode">
      <h2>Отправка ссылки</h2>
      <input
        type="text"
        placeholder="Вставьте ссылку..."
        value={link}
        onChange={e => setLink(e.target.value)}
        maxLength={1024}
      />
      <button onClick={fillFromClipboard}>Вставить из буфера</button>
      <button onClick={send}>Отправить</button>
      <div className="or">или</div>
      <button onClick={scanQR}>Сканировать QR</button>
      <div id="qr-reader" style={{ width: 250, margin: 'auto' }}></div>
      {error && <div className="error">{error}</div>}
    </div>
  );
}

export default function App() {
  const [mobile] = useState(isMobile());
  return (
    <div className="container">
      {mobile ? <MobileMode /> : <PCMode />}
    </div>
  );
}
