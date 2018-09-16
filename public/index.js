"use strict";

var Peer = function () {
  // Module variables
  var connection = null;
  var dataChannel = null;

  var sessionDescription = null;
  // the name of the function used in remote browser to introduce the session
  // info (depends of who started the connection). This exists to facilitate
  // copying and pasting the command in remote peer browser.
  var answerFunctionName = null;

  // Prepares RTC connection and spits ICE candidate data
  function setup() {
    connection = new RTCPeerConnection();

    // Output ICE candidate to console when necessary
    connection.onicecandidate = function (e) {
      if (e.candidate) {
        var iceCandidate = JSON.stringify(e.candidate.candidate);
        console.log("Peer." + answerFunctionName + "(" + sessionDescription + ", " + iceCandidate + ")");
      }
    };
  }

  // Add appropriate callbacks to the datachannel
  function channelSetup(channel) {
    channel.onopen = function () {
      console.log("Channel open");
    };
    channel.onclose = function () {
      console.log("Channel closed");
    };
    channel.onmessage = function (event) {
      console.log("Message received: " + event.data);
    };
  }

  // Called on sender to make a connection offer
  function offer() {

    // Create the data channel in sender and establish its event listeners
    dataChannel = connection.createDataChannel("data");
    channelSetup(dataChannel);

    // Create offer
    connection.createOffer().then(function (offer) {
      // double stringify so we get an escaped string
      // that we can paste on the browser console
      sessionDescription = JSON.stringify(JSON.stringify(offer));
      answerFunctionName = "answer";
      connection.setLocalDescription(offer);
    }).catch(function (err) {
      console.log(err);
    });
  }

  // Called on receiver to answer a connection offer
  function answer(offerJson, iceCandidate) {

    // capture the remote data channel when connection opens
    connection.ondatachannel = function (event) {
      dataChannel = event.channel;
      channelSetup(dataChannel);
    };

    accept(offerJson, iceCandidate).then(function () {
      return connection.createAnswer();
    }).then(function (answer) {
      // double stringify so we get an escaped string
      // that we can paste on the browser console
      sessionDescription = JSON.stringify(JSON.stringify(answer));
      answerFunctionName = "accept";
      connection.setLocalDescription(answer);
    }).catch(function (err) {
      return console.log(error);
    });
  }

  // Given a session description (connection offer or answer), set it
  // as the connection's remote description. Returns the same promise
  // as setRemoteDescription().
  function accept(descriptionJson, iceCandidate) {
    var description = new RTCSessionDescription();
    Object.assign(description, JSON.parse(descriptionJson));
    return connection.setRemoteDescription(description).then(function () {
      return addIceCandidate(iceCandidate);
    }).catch(function (err) {
      console.log(err);
    });
  }

  // Recieves remote peer ICE candidate
  function addIceCandidate(candidate) {
    var rtcIceCandidate = new RTCIceCandidate({ candidate: candidate });
    connection.addIceCandidate(rtcIceCandidate).catch(function (err) {
      return console.log(err);
    });
  }

  // Sends messages through the channel
  function send(message) {
    dataChannel.send(message);
  }

  // run setup
  setup();

  return {
    offer: offer,
    answer: answer,
    accept: accept,
    send: send
  };
}();