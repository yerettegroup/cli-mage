```
    *
   /|\  cli-mage
  /___\  image → ascii
```

# cli-mage

A magical CLI tool that converts images to ASCII art in your terminal.

```
npm install -g github:yerettegroup/cli-mage
```

---

## Usage

```
cli-mage <image> [options]
```

```
cli-mage photo.png
cli-mage photo.png --gradient
cli-mage photo.png --braille -w 200
cli-mage photo.png --gif mage.gif
curl https://example.com/image.png | cli-mage
```

---

## Options

| Flag | Description |
|---|---|
| `-w, --width <n>` | Output width in characters (default: terminal width) |
| `--no-color` | Disable color output |
| `-i, --invert` | Invert brightness |
| `-d, --detailed` | Use a larger, more detailed character set |
| `-g, --gradient` | Rainbow gradient color (ignores source colors) |
| `-e, --edge` | Edge detection mode (Sobel filter) |
| `--braille` | Render using Unicode Braille characters (2× resolution) |
| `--block` | Render using block characters ░▒▓█ |
| `-a, --animate` | Animate in terminal — Ctrl+C to stop |
| `-o, --output <file>` | Save plain-text output to file |
| `--html mage.html` | Export as a colored HTML file |
| `--svg mage.svg` | Export as an SVG file |
| `--gif mage.gif` | Export as an animated GIF |

---

## Requirements

- Node.js 18 or later

---

## License

cli-mage is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

Contact: hello@yerettegroup.com
