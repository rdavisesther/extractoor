import imaplib
import ssl
import email
import re
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime, getaddresses, parseaddr

PROVIDERS = {
    'gmail.com': ('imap.gmail.com', 993, 'Gmail'),
    'googlemail.com': ('imap.gmail.com', 993, 'Gmail'),
    'outlook.com': ('outlook.office365.com', 993, 'Outlook'),
    'hotmail.com': ('outlook.office365.com', 993, 'Outlook'),
    'live.com': ('outlook.office365.com', 993, 'Outlook'),
    'live.fr': ('outlook.office365.com', 993, 'Outlook'),
    'yahoo.com': ('imap.mail.yahoo.com', 993, 'Yahoo'),
    'yahoo.fr': ('imap.mail.yahoo.com', 993, 'Yahoo'),
    'aol.com': ('imap.aol.com', 993, 'AOL'),
    'icloud.com': ('imap.mail.me.com', 993, 'iCloud'),
    'me.com': ('imap.mail.me.com', 993, 'iCloud'),
}


def detect_provider(email_addr):
    domain = (email_addr or '').split('@')[-1].lower()
    info = PROVIDERS.get(domain)
    if info:
        return {'host': info[0], 'port': info[1], 'name': info[2]}
    return None


def build_client_config(creds):
    if creds.get('host'):
        return {'host': creds['host'], 'port': int(creds.get('port') or 993)}
    provider = detect_provider(creds.get('email'))
    if provider:
        return {'host': provider['host'], 'port': provider['port']}
    return {'host': '', 'port': 993}


def error_message(e):
    msg = str(e).lower()
    if any(k in msg for k in ('invalid credentials', 'authentication failed', 'login failed', 'authentication')):
        return 'Authentication failed. The mailbox rejected the credentials.'
    if any(k in msg for k in ('timeout', 'timed out')):
        return 'Connection timed out. The server did not respond in time.'
    if any(k in msg for k in ('connection refused', 'ec onnrefused', 'connect')):
        return 'Unable to connect to the mailbox server. Check the host and port settings.'
    if any(k in msg for k in ('name or service not known', 'getaddrinfo', 'not found', 'resolution')):
        return 'Could not resolve the mail server hostname. Check the email address or host settings.'
    if any(k in msg for k in ('rate limit', 'too many', 'log in disabled', 'too many simultaneous')):
        return 'The provider temporarily limited requests. Please retry later.'
    if any(k in msg for k in ('ssl', 'tls', 'certificate')):
        return 'SSL/TLS handshake failed. The server certificate may be invalid.'
    if 'a password' in msg or 'password' in msg and 'app password' in msg:
        return 'Login failed. You may need an app password for this provider.'
    if any(k in msg for k in ('permanent connection failure', 'no such mailbox')) is False and 'connection' in msg:
        return 'Connection to the mailbox failed. Check provider settings.'
    return 'Unable to connect to the mailbox. Check the email address, app password, and provider settings.'


def _connect(creds):
    cfg = build_client_config(creds)
    host = cfg['host']
    if not host:
        raise ValueError('Could not detect IMAP server for this email domain. Provide host and port manually.')
    ctx = ssl.create_default_context()
    client = imaplib.IMAP4_SSL(host, cfg['port'], ssl_context=ctx, timeout=20)
    try:
        client.login(creds['email'], creds['password'])
    except imaplib.IMAP4.error as e:
        try:
            client.logout()
        except Exception:
            pass
        raise ValueError(error_message(e)) from e
    return client


def test_connection(creds):
    try:
        client = _connect(creds)
        client.logout()
        provider = detect_provider(creds.get('email'))
        return {'success': True, 'provider': provider['name'] if provider else 'Custom IMAP', 'error': None}
    except ValueError as e:
        provider = detect_provider(creds.get('email'))
        return {'success': False, 'provider': provider['name'] if provider else 'Custom IMAP', 'error': str(e)}
    except Exception as e:
        return {'success': False, 'provider': 'Custom IMAP', 'error': error_message(e)}


def list_folders(creds):
    client = _connect(creds)
    try:
        typ, data = client.list()
        folders = []
        for raw in data:
            if not raw:
                continue
            line = raw.decode('utf-8', 'replace')
            m = re.fullmatch(r'\((?P<flags>.*?)\)\s+"(?P<delim>[^"]*)"\s+(?P<name>.*)', line)
            if m:
                delim = m.group('delim')
                name = m.group('name').strip('"')
                flags = m.group('flags')
                folders.append({
                    'name': name,
                    'path': name,
                    'delimiter': delim or '/',
                    'flags': flags.split() if flags else [],
                })
            else:
                folders.append({'name': line, 'path': line, 'delimiter': '/', 'flags': []})
        return folders
    finally:
        try:
            client.logout()
        except Exception:
            pass


def _decode(value):
    if not value:
        return ''
    try:
        return str(make_header(decode_header(value)))
    except Exception:
        return str(value)


def _address_list(value):
    if not value:
        return ''
    out = []
    for name, addr in getaddresses([value]):
        if name and addr:
            out.append(f'{name} <{addr}>')
        elif addr:
            out.append(addr)
        elif name:
            out.append(name)
    return ', '.join(out)


def _address_emails(value):
    if not value:
        return ''
    return ', '.join(addr for _, addr in getaddresses([value]) if addr)


def _extract_body(msg):
    text = None
    html = None
    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            if ctype == 'text/plain' and text is None:
                text = _decode(part.get_payload(decode=True)) if part.get_payload(decode=True) is not None else ''
                if hasattr(part, 'get_content_charset') and part.get_content_charset():
                    charset = part.get_content_charset()
                    raw = part.get_payload(decode=True)
                    if raw is not None:
                        text = raw.decode(charset, 'replace')
            elif ctype == 'text/html' and html is None:
                raw = part.get_payload(decode=True)
                if raw is not None and part.get_content_charset():
                    html = raw.decode(part.get_content_charset(), 'replace')
                elif raw is not None:
                    html = raw.decode('utf-8', 'replace')
    else:
        text = msg.get_payload(decode=True)
        if text is not None:
            charset = msg.get_content_charset() or 'utf-8'
            text = text.decode(charset, 'replace')
    return (text or '').strip(), (html or '') or None


def _strip_tags(html):
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def _attachments(msg):
    out = []
    if msg.is_multipart():
        for part in msg.walk():
            fn = part.get_filename()
            if fn:
                out.append(_decode(fn) or 'unnamed')
    return out


def extract_emails(creds, folders, start_from, count, fields):
    client = _connect(creds)
    rows = []
    processed = 0
    found = 0
    skipped = 0
    errors = 0
    try:
        want_uid = 'uid' in fields
        want_envelope = any(f in fields for f in ('subject', 'date', 'messageId'))
        for folder in folders:
            if found >= count:
                break
            try:
                typ, data = client.select(folder, readonly=True)
                if typ != 'OK':
                    errors += 1
                    continue
            except Exception:
                errors += 1
                continue
            try:
                total_msgs = int(data[0])
            except Exception:
                total_msgs = 0
            if total_msgs == 0:
                continue
            start = max(1, int(start_from or 1))
            end = min(start + int(count or 100) - 1, total_msgs)
            if start > total_msgs:
                skipped += total_msgs
                continue
            if end < start:
                continue
            seq = f'{start}:{end}'
            fetch = '(BODY.PEEK[])'
            if want_uid:
                fetch = f'(UID {fetch})'
            typ, msgs = client.fetch(seq, fetch)
            if typ != 'OK':
                errors += 1
                continue
            for mnum, data_block in reversed(msgs):
                if found >= count:
                    break
                processed += 1
                try:
                    raw = None
                    uid = None
                    if isinstance(data_block, tuple):
                        meta = data_block[0].decode('utf-8', 'replace')
                        body = data_block[1]
                        # meta looks like b'1 (UID 123 BODY[HEADER] {xxx}' or '1 (BODY[] {xxx}'
                        m_uid = re.search(r'UID\s+(\d+)', meta)
                        if m_uid:
                            uid = m_uid.group(1)
                        if body is None:
                            skipped += 1
                            continue
                        msg = email.message_from_bytes(body)
                    else:
                        # likely a status response line; skip
                        skipped += 1
                        continue

                    row = {'uid': uid, 'folder': folder}
                    text_body, html_body = _extract_body(msg)
                    for f in fields:
                        if f == 'fromName':
                            row['fromName'] = parseaddr(_decode(msg.get('From', '')))[0] or None
                        elif f == 'fromEmail':
                            row['fromEmail'] = parseaddr(_decode(msg.get('From', '')))[1] or None
                        elif f == 'to':
                            row['to'] = _address_list(msg.get('To')) or None
                        elif f == 'cc':
                            row['cc'] = _address_list(msg.get('Cc')) or None
                        elif f == 'bcc':
                            row['bcc'] = _address_list(msg.get('Bcc')) or None
                        elif f == 'subject':
                            row['subject'] = _decode(msg.get('Subject')) or None
                        elif f == 'date':
                            row['date'] = _decode(msg.get('Date')) or None
                        elif f == 'messageId':
                            row['messageId'] = _decode(msg.get('Message-ID')) or None
                        elif f == 'replyTo':
                            row['replyTo'] = _address_list(msg.get('Reply-To')) or None
                        elif f == 'body':
                            row['body'] = text_body or None
                        elif f == 'textBody':
                            row['textBody'] = text_body or None
                        elif f == 'htmlBody':
                            row['htmlBody'] = html_body
                        elif f == 'attachments':
                            row['attachments'] = _attachments(msg)
                    found += 1
                    rows.append(row)
                except Exception:
                    errors += 1
        return {'results': rows, 'stats': {
            'processed': processed, 'found': found, 'skipped': skipped, 'errors': errors,
        }}
    finally:
        try:
            client.logout()
        except Exception:
            pass
