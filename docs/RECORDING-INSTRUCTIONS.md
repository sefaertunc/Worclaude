# Recording the Demo GIF

Instructions for recording the terminal GIF used in the README.

## Prerequisites

1. Install [asciinema](https://asciinema.org/):
   ```bash
   pip install asciinema
   ```

2. Install [agg](https://github.com/asciinema/agg) (asciinema GIF generator):
   ```bash
   cargo install agg
   ```

## Recording Steps

3. Create a temporary project directory:
   ```bash
   mkdir /tmp/worclaude-demo && cd /tmp/worclaude-demo
   git init
   ```

4. Start recording:
   ```bash
   asciinema rec demo.cast --cols 100 --rows 30
   ```

5. Run the init flow inside the recording:
   ```bash
   worclaude init
   ```
   Walk through the prompts: select **Backend / API** as project type, choose **Python** as the language, answer **yes** to Docker, and accept the recommended agents.

6. Stop the recording with `exit` or `Ctrl+D`.

## Converting to GIF

7. Convert the recording to GIF:
   ```bash
   agg demo.cast demo.gif --theme monokai --font-size 16 --speed 1.5
   ```

## Finishing Up

8. Copy the GIF to the docs directory:
   ```bash
   cp demo.gif /path/to/Worclaude/docs/public/demo.gif
   ```

9. Uncomment the GIF line in `README.md`:
   ```markdown
   ![worclaude init demo](docs/public/demo.gif)
   ```

10. Verify the GIF renders correctly in a local markdown preview before committing.
