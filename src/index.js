// App global state.
//

const state = {
    appId: '',
    room: '',
    jwt: '',
    connection: undefined,
    conference: undefined,
};

// Form elements.
//

const appIdEl = document.getElementById('appIdText');
const roomEl = document.getElementById('roomText');
const jwtEl = document.getElementById('jwtText');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');

function updateJoinForm() {
    // In a meeting.
    if (state.connection) {
        appIdEl.disabled = true;
        roomEl.disabled = true;
        jwtEl.disabled = true;
        joinBtn.disabled = true;
        leaveBtn.disabled = false;
    } else {
        appIdEl.disabled = false;
        roomEl.disabled = false;
        jwtEl.disabled = false;
        joinBtn.disabled = state.appId.length === 0 || state.room.length === 0 || state.jwt.length === 0;
        leaveBtn.disabled = true;
    }
}

updateJoinForm();

appIdEl.onchange = () => {
    state.appId = appIdEl.value.trim();
    updateJoinForm();
}

roomEl.onchange = () => {
    state.room = roomEl.value.trim();
    updateJoinForm();
}

jwtEl.onchange = () => {
    state.jwt = jwtEl.value.trim();
    updateJoinForm();
}

joinBtn.onclick = async () => {
    await connect();
    updateJoinForm();
};

leaveBtn.onclick = async () => {
    await leave();
    updateJoinForm();
};


function buildOptions(appId, room) {
    return {
        hosts: {
            domain: '8x8.vc',
            muc: `conference.${appId}.8x8.vc`
        },
        serviceUrl: `wss://8x8.vc/${appId}/xmpp-websocket?room=${room}`,
        websocketKeepAliveUrl: `https://8x8.vc/${appId}/_unlock?room=${room}`,
    };
}

const TrackOps = {
    ADD: 'ADD',
    REMOVE: 'REMOVE'
};

const handleTrackAdded = track => {
    if (track.getType() === 'video') {
        const meetingGrid = document.getElementById('meeting-grid');
        const videoNode = document.createElement('video');

        videoNode.id = track.getId();
        videoNode.className = 'jitsiTrack col-4 p-1';
        videoNode.autoplay = true;
        meetingGrid.appendChild(videoNode);
        track.attach(videoNode);
    } else if (!track.isLocal()) {
        const audioNode = document.createElement('audio');

        audioNode.id = track.getId();
        audioNode.className = 'jitsiTrack';
        audioNode.autoplay = true;
        document.body.appendChild(audioNode);
        track.attach(audioNode);
    }
};

const handleTrackRemoved = track => {
    track.dispose();
    document.getElementById(track.getId())?.remove();
};

const onConferenceJoined = () => {
    console.log('conference joined!');
};

const onConferenceLeft = () => {
    console.log('conference left!');
};

const onUserJoined = id => {
    console.log('user joined!', id);
};

const onUserLeft = id => {
    console.log('user left!', id);
};

const onConnectionSuccess = async () => {
    // Initialize conference
    const c = state.conference = state.connection.initJitsiConference(state.room, {});

    // Setup event listeners
    c.on(
        JitsiMeetJS.events.conference.TRACK_ADDED,
        handleTrackAdded);
    c.on(
        JitsiMeetJS.events.conference.TRACK_REMOVED,
        handleTrackRemoved);
    c.on(
        JitsiMeetJS.events.conference.CONFERENCE_JOINED,
        onConferenceJoined);
    c.on(
        JitsiMeetJS.events.conference.CONFERENCE_LEFT,
        onConferenceLeft);
    c.on(
        JitsiMeetJS.events.conference.USER_JOINED,
        onUserJoined);
    c.on(
        JitsiMeetJS.events.conference.USER_LEFT,
        onUserLeft);

    // Create local tracks
    const localTracks = await JitsiMeetJS.createLocalTracks({ devices: [ 'audio', 'video' ] });

    // Add local tracks before joining
    for (const track of localTracks) {
        await c.addTrack(track);
    }

    // Join
    c.join();
};

const onConnectionFailed = () => {
    console.error('connection failed!');
};

const onConnectionDisconnected = () => {
    console.log('connection disconnected!');
};

async function connect() {
    const options = buildOptions(state.appId, state.room);

    // Create connection.
    const connection = state.connection = new JitsiMeetJS.JitsiConnection(null, state.jwt, options);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    connection.addEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        onConnectionDisconnected);

    connection.connect();
}

// Leave the room and proceed to cleanup.
async function leave() {
    if (state.conference) {
        await state.conference.leave();
    }

    if (state.connection) {
        await state.connection.disconnect();
    }

    state.connection = undefined;
    state.conference = undefined;
}

// Initialize library.
JitsiMeetJS.init();
JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.INFO);
console.log(`using LJM version ${JitsiMeetJS.version}!`);
