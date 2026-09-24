# Test with AI — v1

A crowd of AI agents judges your options against your brief.

Each vote comes from a brand-new agent, started in its own process with its own session. It gets your brief, a persona and the options, and nothing else. It picks one option, names a runner-up and says why. Then it exits. Run that 50 times and count the votes.

It runs on your machine, through your own [Claude Code](https://claude.com/claude-code) login. Nothing goes to any server except Anthropic's, through your CLI.

The write-up, with real experiments and results: **[noorandmachine.com/design/test-with-ai](https://noorandmachine.com/design/test-with-ai/)**

## What you need

- **Node.js 22 or newer.** Check with `node --version`.
- **Claude Code**, installed and logged in. Check with `claude --version`. If you've never used it, run `claude` once in a terminal and follow the login steps. A Claude subscription or an API key both work.
- **Google Chrome, Microsoft Edge or Chromium.** You only need one of these to test web pages (URLs). If yours is somewhere unusual, set `CHROME_PATH` to its executable.

There's nothing to install from npm. The tool has no dependencies.

## Run it

```bash
git clone https://github.com/ShaheryarWarraich/noorandmachine-public.git
cd noorandmachine-public/test-with-ai/v1
npm start
```

Open **http://127.0.0.1:4330**.

To use another port, run `PORT=5000 npm start`.

## Your first test

1. **Brief.** Describe the situation and the decision in plain words. For example: *"A bakery is choosing a new sign. Which option would make you walk in?"*
2. **Personas (up to 3).** Describe who each person is, such as their job and their situation. **Don't describe their taste.** If you write "likes friendly designs", the agent will pick the friendly one every time.
3. **Options.** Put anything in each option:
   - text
   - one or more URLs (the page is screenshotted)
   - images, PDFs or text files

   **Paste many** turns a block of text into options, split on lines with `---`. **Import a sheet** takes one image or page that shows many options side by side and finds each one.
4. **Rubric (optional).** Add a neutral expert who scores every option on your criteria, one per line with an optional weight, like `Trust 20`. When it's on, it counts for 50% of the final score.
5. **Save & prepare.** Check the **What agents see** tab. It shows the exact prompt each agent will get.
6. **Start.** Watch the **Live feed**. Results fill in as runs finish.

Start small (5–10 runs) to check your brief, then do the full run.

## What you'll see

- **Live feed**: every agent call, with its session ID, process ID, time and pick. Click any row to see:
  - the exact prompt and command
  - the event timeline
  - the raw answer
- **Results**: the winner, votes overall and per persona, runner-up mentions, and how settled each persona is. It also shows why agents chose the winner, with the person behind each reason.
- **Last run explained**: who each agent was, what it chose and why.
- **How it works**: proof that no context was reused (calls against unique sessions), and every flag used.

## How the isolation works

Every agent is a separate run of:

```text
claude -p <prompt> --model <model> --effort <level>
  --restricted --safe-mode --strict-mcp-config --disable-slash-commands --setting-sources ""
  --system-prompt <fixed one-liner> --tools Read --allowedTools Read --add-dir <test folder>
  --no-session-persistence --output-format stream-json --verbose --json-schema <answer shape>
```

- No `--resume` or `--continue`. Every call is a new session, and nothing is saved between them.
- `--safe-mode` and `--setting-sources ""` turn off your CLAUDE.md, memory, plugins, hooks and settings.
- `--restricted` with `--tools Read` means an agent can only read the files in that test's own folder. It can't run code or use the web.
- **Blind to your names and order.** Uploaded files are renamed (`final_best.png` becomes `opt-D-1.png`), your option names are never shown to agents, and the order is shuffled on every call.
- **Protected from prompt injection.** Text inside an option is treated as material to judge, never as instructions.

## Cost and limits

- Each agent call reads your options and answers. In our tests a call cost about **$0.04–0.10 at list price** on Opus 5.5 with high reasoning. More images or longer pages cost more.
- 50 runs × 3 personas is 150 calls. The page shows an estimate per run before you start.
- With a Claude subscription, calls count toward your plan's usage limits instead. If you hit a limit mid-test, the test pauses and continues when the limit resets.
- Pick a model your plan includes. The model and reasoning level are set per test.

## Where your data lives

- Tests, results and logs are saved in `data.json` next to `server.js`.
- Uploaded files and screenshots are saved in `workspace/<test id>/`.
- Both are git-ignored. To delete a test and its files, use the **Delete** button.
- The server only listens on `127.0.0.1`, and rejects requests from other hosts and websites.

## Good to know

- **These are simulated people, not a focus group.** One model asked many times agrees with itself a lot. A winner across very different people is a useful signal, and a split is too. Treat it as a fast first read, not the last word.
- **The model's private reasoning isn't shown.** The API only reports how many tokens it used. That's why every answer includes a reason and a runner-up.
- **Screenshots have limits.** Pages behind a login, a cookie wall or bot protection won't capture properly. Content that only appears after a click won't be captured either. Very long pages are cut at 24,000px.
- **Platforms.** Built and tested on macOS with Claude Code 2.1.282. Linux should work. Windows is untested.
- **CLI changes.** It depends on Claude Code flags and its `stream-json` output. If a future CLI version changes them, calls will fail with the CLI's own error in the Live feed.

## Files

| File | What it does |
|---|---|
| `server.js` | Local web server, test storage, preparing tests, running them |
| `runner.js` | Starts one `claude -p` agent and records everything it does |
| `prompts.js` | Builds each agent's prompt and answer format |
| `capture.js` | Screenshots web pages with headless Chrome |
| `tally.js` | Turns runs into results |
| `public/index.html` | The interface |

## License

MIT. See [LICENSE](../../LICENSE).

— MSW/Noor and Machine
