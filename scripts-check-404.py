import re
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "out/404.html"
h = open(path).read()
print("title:", re.findall(r"<title[^>]*>[^<]*", h))
print("robots:", re.findall(r'<meta name="robots"[^>]*>', h))
print("description:", re.findall(r'<meta name="description"[^>]*>', h))
print("header:", "o-topbar" in h, "footer:", "o-footer" in h)
for slug in [
    "weight-converter",
    "temperature-converter",
    "password-generator",
    "json-formatter",
]:
    print(slug, h.count("/tools/" + slug))
print("h1:", re.findall(r"<h1[^>]*>[^<]*", h))
print("home links:", len(re.findall(r'href="/"', h)))
print("has input/button in main:", bool(re.search(r"<input|<button", h)))
