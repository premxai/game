# Two-player getaway

Start the two-player getaway from the projector. One player drives, the other moves and taps Board / Boost near the taxi. After boarding, the runner can trigger a 1.5-second boost every six seconds while the driver accelerates.

# Five More Blocks · Fish Market Drive

Open host.html in a desktop browser. Choose **Solo practice** for the short solo route. Use Up for gas, Down to brake or reverse, Left and Right to steer, and Shift to slide. Roll forward and stop before the first striped crossing. Once clear, pass the curbside traffic and stop beside the red-jacketed runner at the fish market. The runner boards automatically. There is no practice time limit. The timer shows elapsed seconds.

Choose **Start two-player getaway** for the 90-second two-player ferry getaway. On one keyboard the runner moves with WASD and boards with Space near the taxi. For phones, extract the whole folder and run START-WINDOWS.cmd or node server.cjs using Node.js 20+. Open the projector address, connect phones on the same network and scan the QR. Choose different roles and start the two-player getaway. LAN_IP overrides the advertised interface and PORT defaults to 8080.

The original vehicle models and fictional waterfront are inspired by San Francisco's working wharves. In WebGL mode the body paint and glass respond to the view and simulated sky. Traffic includes hatchbacks, sedans, SUVs and a delivery van. Parked vehicles are solid. Switch to City map for an overview. Audio starts with the first button press. Mute engine silences it.

Driving, traffic and pedestrians simulate at 60 ticks per second. Keep the projector tab visible during a round. The captain, tow operator and rival retain their earlier decision logic. In server mode, completed co-op rounds with a recorded ferry approach append to rounds.ndjson. Run bruin run ./analysis/pipeline.yml with Bruin CLI and Python to aggregate route history for later decisions.

## Ferry Building pickup
Start the server, choose Ferry Building pickup, and scan the QR on a second device on the same Wi-Fi. Choose Dispatch a pickup, then select a corner. The dispatcher sees the taxi, queue and passenger on a strip map. Stop the cab beside the passenger. The projector also has a pickup selector for offline play. Restart with Ferry Building pickup to swap roles.
The streets are a compressed interpretation of the Market Street waterfront. For live F-line predictions set MUNI_511_KEY to a Bay Area 511 API key before launching the server. Uses SFMTA stop 14513. The game runs offline when the feed is unavailable.

## Ferry mission with the AI crew
Ferry Building pickup now continues after boarding. The captain calls a patrol, the tow operator closes a crossing, and the rival races to the waterfront. The agent ledger records their reasons. Drive through the open Market or Quay crossing and reach the ferry landing to finish. The next captain decision considers earlier exits. Keep the server and projector running between rounds.

Install the Bruin CLI and put it on PATH to refresh shared route memory automatically after a finish. If the CLI is unavailable, the projector can still remember rounds locally. To run the shared pipeline manually from the game folder, use bruin run ./analysis/pipeline.yml. Its input is rounds.ndjson and its output is route-memory.json.
