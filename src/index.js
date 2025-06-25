// App global state.
//

const state = {
    appId: '',
    room: '',
    jwt: '',
    conference: undefined,
    localAudioTrack: undefined
};

// Form elements.
//

const appIdEl = document.getElementById('appIdText');
const roomEl = document.getElementById('roomText');
const jwtEl = document.getElementById('jwtText');
const joinBtn = document.getElementById('joinBtn');
const leaveBtn = document.getElementById('leaveBtn');
const audioSettingsForm = document.getElementById('audioSettings');

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
	} else {
        if (track.isLocal()) {                  
            const checkboxes = audioSettingsForm.querySelectorAll('.form-check-input');
            const audioTrackSettings = track.getTrack().getSettings();
 
            checkboxes.forEach(cb => {
                cb.checked = cb.id === 'channelCount' ? audioTrackSettings[cb.id] === 2 : audioTrackSettings[cb.id];   
            }) 
        
            state.localAudioTrack = track;
            audioSettingsForm.style.visibility = 'visible';
		} else {
			const audioNode = document.createElement('audio');

			audioNode.id = track.getId();
			audioNode.className = 'jitsiTrack';
			audioNode.autoplay = true;
			document.body.appendChild(audioNode);
			track.attach(audioNode);
		}
	}
};

const handleTrackRemoved = track => {
    track.dispose();
    document.getElementById(track.getId())?.remove();

    if (track.getTrack().id === state.localAudioTrack.getTrack().id) {
        state.localAudioTrack = null;
        audioSettingsForm.style.visibility = 'hidden';
    }
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

async function handleBtnSettings() {
    const checkboxes = audioSettingsForm.querySelectorAll('.form-check-input');
    const audioSettings = {};
    
    checkboxes.forEach(cb => {
        audioSettings[cb.id] = cb.id === 'channelCount' ? (cb.checked ? 2 : 1) : cb.checked;
    });

    try {
        await state.localAudioTrack.applyConstraints(audioSettings);
    } catch(err) {
        console.error(err);
    }   
    
    const audioTrackSettings = state.localAudioTrack.getTrack().getSettings();

    checkboxes.forEach(cb => {
        cb.checked = cb.id === 'channelCount' ? audioTrackSettings[cb.id] === 2 : audioTrackSettings[cb.id];   
    }) 
}
document.getElementById('btnSettings').addEventListener('click', handleBtnSettings);

// Initialize library.
JitsiMeetJS.init();
console.log(`using LJM version ${JitsiMeetJS.version}!`);
