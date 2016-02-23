'use strict';

const electron = require('electron');
const fs = require('fs');
const app = electron.app;
const Menu = electron.Menu;
const Tray = electron.Tray;
const dialog = electron.dialog;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;
const path = require('path');

let countdownIcon = null;

let countdowns = undefined;

const userDataFileStorage = `${app.getPath('userData')}/events.js`;

fs.access(userDataFileStorage, fs.F_OK && fs.R_OK && fs.W_OK, (err) => {
  if (err) {
    console.log('cannot access or not exist');
  } else {
    const storageContent = fs.readFileSync(userDataFileStorage, 'utf8');
    countdowns = JSON.parse(storageContent);
  }
});

if (!countdowns) {
  countdowns = [];
}


function createInputBrowserWIndow(eventObj) {
  let addCountdownWindow = new BrowserWindow({
    width: 640,
    height: 360,
    show: false,
    center: true,
    resizable: false,
    fullscreen: false,
    title: 'Add Countdown Event',
  });

  // addCountdownWindow.on('closed', function() {
  //   mainWindow = null;
  // });

  addCountdownWindow.loadURL('file://' + __dirname + '/index.html');

  const webContents = addCountdownWindow.webContents;
  // webContents.openDevTools();

  webContents.on('did-finish-load', () => {
    addCountdownWindow.show();
    let eventInfo;
    if (eventObj === undefined) {
      eventInfo = JSON.stringify([undefined, undefined, undefined]);
    } else {
      eventInfo = JSON.stringify([eventObj.event, eventObj.date, eventObj.id]);
    }
    webContents.send('eventData', eventInfo);
  });
}

function constructMenu(cds) {
  const countdownItems = cds.map((cd) => {
    const diff = (new Date(cd.date)) - (new Date()); // in milliseconds
    const diffInDays = Math.floor(diff/1000/3600/24);

    let dateInfo = `${Math.abs(diffInDays)} ${Math.abs(diffInDays) > 1 ? 'Days' : 'Day'} ${diffInDays < 0 ? 'Ago' : 'Left'}`

    return [{
      label: `${cd.event}`,
      click: () => {
        EDIT_COUNTDOWN(cd);
      },
    }, { label: `${dateInfo}`, enabled: false }];
  }).reduce((prev, curr) => prev.concat(curr), []); // flattern

  const menuItems = [{
    label: 'About cd-mb--text',
  },
  {
    type: 'separator',
  }]
  .concat(countdownItems)
  .concat([{
    type: 'separator',
  },
  {
    label: 'Add',
    click: (menuItem, browserWindow) => {
      console.log('add clicked');
      ADD_COUNTDOWN();
    },
  },
  {
    type: 'separator',
  },
  {
    label: 'Quit',
    click: app.quit,
  }]);

  return Menu.buildFromTemplate(menuItems);
}

const ADD_COUNTDOWN = () => {
  console.log('ADD_COUNTDOWN');
  createInputBrowserWIndow();
}

const EDIT_COUNTDOWN = (eventObj) => {
  console.log('EDIT_COUNTDOWN');
  createInputBrowserWIndow(eventObj);
}

app.on('ready', function(){
  // app icons

  // get from https://icons8.com/c/flat-color-icons
  countdownIcon = new Tray(path.join(__dirname, '/icon.png'));
  // countdownIcon.setPressedImage(path.join(__dirname, 'menubar-icon-alt.png'));



  countdownIcon.setToolTip('countdown-menubar--text');
  countdownIcon.setContextMenu(constructMenu(countdowns));
});

app.on('window-all-closed', function(e){
  e.preventDefault();
});

app.on('quit', (e) => {
  fs.writeFile(userDataFileStorage, JSON.stringify(countdowns), {flag: 'w'}, (err) => {
    if (err) throw err;
    console.log('It\'s saved!');
  });
})

app.dock.hide();

ipcMain.on('editOrCreate', function(ev, arg) {
  const updatedData = JSON.parse(arg);

  const eventName = updatedData[0];
  const eventDate = updatedData[1];
  const eventId = updatedData[2];
  let returnMsg;
  if (eventId === null || eventId === undefined) {
    countdowns.push({
      event: eventName,
      date: eventDate,
      id: (new Date()).toString(),
    });
    returnMsg = 'Created';
  } else {
    let targetCD = countdowns.filter(cd => cd.id === eventId)[0];
    targetCD.event = eventName;
    targetCD.date = eventDate;
    returnMsg = 'Updated';
  }

  countdownIcon.setContextMenu(constructMenu(countdowns));

  ev.sender.send('updated', returnMsg);
});
