# Running the App in WSL2

## Quick Start

1. **Open Windows Terminal/PowerShell as Administrator** and run:
   ```powershell
   # Get WSL IP
   wsl hostname -I
   # Note the IP address (e.g., 172.31.211.249)
   
   # Set up port forwarding (replace with your WSL IP)
   netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.31.211.249
   ```

2. **In WSL terminal**, navigate to the project and run:
   ```bash
   cd "/home/my_horizon/.claude/projects/DWS_Chatbot - BETA"
   npm run dev
   ```

3. **In your browser**, go to:
   ```
   http://localhost:5173/
   ```

## Alternative: Use VS Code Port Forwarding

1. Open the project in VS Code
2. Start the dev server: `npm run dev`
3. Go to the "Ports" tab in VS Code (usually at the bottom)
4. Click "Forward a Port" and enter 5173
5. VS Code will give you a URL to access

## Troubleshooting

If you see "site can't be reached":

1. **Check Windows Firewall**: Make sure it's not blocking the port
2. **Try different browsers**: Sometimes Edge works better with WSL
3. **Use the WSL IP directly**: http://[YOUR-WSL-IP]:5173/
4. **Restart WSL**: In PowerShell run `wsl --shutdown` then reopen WSL

## To Remove Port Forwarding

```powershell
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0
```