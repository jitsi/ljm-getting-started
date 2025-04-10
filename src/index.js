// App global state.
//

const state = {
    appId: '',
    room: '',
    jwt: '',
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
    if (state.conference) {
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

async function connect() {
    // Create local tracks
    const localTracks = await JitsiMeetJS.createLocalTracks({ devices: [ 'audio', 'video' ] });
    const joinOptions = {
        tracks: localTracks,
    };
    const c = await JitsiMeetJS.joinConference(state.room, state.appId, state.jwt, joinOptions);

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

    state.conference = c;
}

// Leave the room and proceed to cleanup.
async function leave() {
    if (state.conference) {
        await state.conference.dispose();
    }

    state.conference = undefined;
}

// Initialize library.
JitsiMeetJS.init();
console.log(`using LJM version ${JitsiMeetJS.version}!`);
