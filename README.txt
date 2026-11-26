SARPBC HTML5 PORT — ENHANCED BUILD

Changes in this build:
- Fixed the malformed ball shadow/ball rendering expressions that could stop the game loop.
- Added desktop keyboard controls alongside the existing touch controls.
- Improved acceleration, steering response, momentum, ground traction, and air handling.
- Added speed limiting and arena-wall rebounds for cars.
- Added visible small and large boost pads with boost refill and respawn timers.
- Tuned ball gravity, bounce, drag, and car-hit response.
- Corrected the PeerJS CDN script URL used by online matchmaking.
- Updated the service-worker cache version and activation cleanup.

Controls (desktop):
- W / Up Arrow: accelerate
- S / Down Arrow: reverse
- A / Left Arrow: steer left
- D / Right Arrow: steer right
- Space or X: jump / second jump
- Shift or Z: boost
- R: reset offline match

Controls (touch):
- Left virtual stick: steer and accelerate/reverse
- JUMP button: jump / second jump
- BOOST button: boost

Open index.html through a local web server or host the contents of this folder on a static web host. Audio, service workers, and online features work best over HTTPS.
