"# IC-EventMarketplace"

This a canister that allows users to:

1. Create an event
2. Fetch and view all events 
3. Fetch and view event by an id
4. Attend an event
5. Update event by an id
6. Delete an event if you are the owner of that event


### To get started
#### 1. clone the repository
```bash
git clone https://github.com/Chigozie0706/IC-EventMarketplace.git
```
#### 2. Next, move into the cloned repository's directory with:
```bash
cd IC-EventMarketplace
```
#### 3. Finally, install the project's dependencies by running:
```bash 
npm install

```
#### 4. Install Node Version Manager (nvm)
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
```
#### 5. Switch to Node.js version 18
```bash
nvm use 18
```

#### 6. Install DFX
```bash
DFX_VERSION=0.14.1 sh -ci "$(curl -fsSL https://sdk.dfinity.org/install.sh)"
```
#### 7. Add DFX to your path
```bash
echo 'export PATH="$PATH:$HOME/bin"' >> "$HOME/.bashrc"
```
> Reload the terminal after running the above command

#### 8. Start local internet computer
```bash
dfx start --background
```
#### 9. Deploy the canister(contract)
```bash
dfx deploy
```
