"""Serve a built Next trial on loopback using only Python's standard library."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Timer
from urllib.parse import urlsplit
import webbrowser


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if urlsplit(self.path).path in ('/next/explore', '/next/explore/'):
            self.path = '/index.html'
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--directory', type=Path, default=Path(__file__).resolve().parent.parent / 'dist')
    parser.add_argument('--port', type=int, default=4175)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args()
    directory = args.directory.resolve()
    if not (directory / 'index.html').is_file():
        parser.error('Build output is missing. Run pnpm run build, or extract the complete preview ZIP first.')
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, directory=str(directory)))
    except OSError as error:
        parser.error(f'Cannot open local port {args.port}: {error}. Close the previous preview window or choose another --port.')
    url = f'http://127.0.0.1:{server.server_port}/next/explore?locale=zh'
    print(f'Diffusion Next local trial: {url}', flush=True)
    print('Keep this window open. Press Ctrl+C to stop. Notebook data stays in this browser.', flush=True)
    if not args.no_open:
        timer = Timer(0.5, webbrowser.open, args=(url,))
        timer.daemon = True
        timer.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
