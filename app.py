"""
Starts the dashboard.
  python app.py             native window (pywebview), this is what the .exe does
  python app.py --browser   opens your default browser instead (handy while developing);
                            add --no-open to only print the address

A tiny local web server serves the web/ folder, so fetch() works in the browser
and inside the packaged .exe.
"""
import functools
import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def resource_path(rel):
    # this function allows us to run the script both direclty in Python and in the .exe packet
    """Folder next to this file, or the PyInstaller temp folder inside the .exe."""
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass  # windowed .exe has no stderr; the default logger would crash


def start_server(root):
    handler = functools.partial(QuietHandler, directory=root)
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)  # port 0 = any free port
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


def main():
    server = start_server(resource_path("web"))
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html"

    if "--browser" in sys.argv:
        print(f"Dashboard running at {url} (Ctrl+C to stop)", flush=True)
        if "--no-open" not in sys.argv:
            webbrowser.open(url)
        try:
            threading.Event().wait()
        except KeyboardInterrupt:
            pass
    else:
        import webview  # imported here so --browser works without pywebview
        webview.create_window("Who decarbonised their electricity? 2015-2024", url,
                              width=1600, height=900, min_size=(1200, 700))
        webview.start()
    server.shutdown()


if __name__ == "__main__":
    main()
