import { StepData } from "./common.js";
import { ScrollyError } from "./common.js";
import { validateStepDataArray } from "./common.js";

import { fetchAllDataFromGoogleSheet } from "./google-sheet.js";

let main = null;
let contentSection = null;
let scrollyStory = null;
let stickyImageContainer = null;
let stickyMapContainer = null;
let stickyVideoContainer = null;
let steps = null;
let prevStepData = null;

const transitionInMilliseconds = 500;

// initialize the scrollama
let scroller = scrollama();

document.addEventListener("DOMContentLoaded", async function () {
  main = document.querySelector("main");
  contentSection = document.querySelector("#content-section");
  scrollyStory = main.querySelector(".scrolly-container");

  //createScrollyContentFromCSVFile();
  try {
    const allScrollyData = await fetchAllDataFromGoogleSheet();
    allScrollyData.storyData.validate(
      "Reading Google Sheet story tab (first sheet)"
    );
    validateStepDataArray(
      allScrollyData.stepData,
      "Reading Google Sheet steps tab (2nd sheet)"
    );
    createAllScrollyContentInHTML(allScrollyData);
  } catch (scrollyError) {
    displayThenThrowError(scrollyError);
  }

  // initialize scrollama only after the scrolly content has been created
  initScrollama();
});

function createAllScrollyContentInHTML(allScrollyData) {
  createStoryContentInHtml(allScrollyData.storyData);
  createStepsContentInHtml(allScrollyData.stepData);

  // horizontalPercentage has to be set after Steps are created
  // because that's when the sticky containers (that get their
  // width set) are created
  setHorizontalWidthOfTextAndStickyContent(
    allScrollyData.storyData.textHorizontalPercentage
  );
}

function createStoryContentInHtml(storyData) {
  const storyTitle = document.getElementById("story-title");
  storyTitle.innerHTML = storyData.title;

  const browserTitle = document.getElementById("browser-title");
  browserTitle.innerHTML = storyData.title;

  const subtitle = document.getElementById("subtitle");
  subtitle.innerHTML = storyData.subtitle;

  const endText = document.getElementById("end-text");
  endText.innerHTML = storyData.endText;
}

function setHorizontalWidthOfTextAndStickyContent(horizontalPercentage) {
  if (horizontalPercentage < 99 && horizontalPercentage > 1) {
    // Width is specified as a percentage of the horizontal spacce for the text
    const article = document.querySelector("article");
    article.style.width = `${horizontalPercentage}%`;

    // Sticky content is the remaining horizontal space, but we have to account
    // for each kind of sticky content
    const stickyContent = document.querySelectorAll(".sticky-content");
    stickyContent.forEach((stickyContentDiv) => {
      stickyContentDiv.style.width = `${100 - horizontalPercentage}%`;
    });
  }
}

/* This creates all the steps in HTML for the scrolly story 
    from a stepDataArry 
*/
function createStepsContentInHtml(stepDataArray) {
  var stepNumber = 1;
  var scrollContainerCount = 1;
  let scrollyContainer = createScrollyContainer(scrollContainerCount);
  let storySteps = document.createElement("article");

  stepDataArray.forEach((stepData) => {
    var stepElement = document.createElement("div");
    stepElement.classList.add("step");
    // dataset contains the scrollama custom elements that map to HTML
    // so updating dataset updates the HTML attributes
    stepElement.dataset.step = stepNumber;
    stepElement.dataset.contentType = stepData.contentType;
    if (stepData.filePath) {
      stepElement.dataset.filePath = stepData.filePath;
    }
    if (stepData.altText) {
      stepElement.dataset.altText = stepData.altText;
    }
    if (stepData.latitude) {
      stepElement.dataset.latitude = stepData.latitude;
    }
    if (stepData.longitude) {
      stepElement.dataset.longitude = stepData.longitude;
    }
    if (stepData.zoomLevel) {
      stepElement.dataset.zoomLevel = stepData.zoomLevel;
    }

    stepElement.innerHTML = `<p class="step-content">${stepData.text}</p>`;
    storySteps.appendChild(stepElement);
    stepNumber++;
  });

  scrollyContainer.appendChild(storySteps);
  scrollyContainer.appendChild(createStickyContainers(scrollContainerCount));
  contentSection.replaceChildren(scrollyContainer);

  // re-query the steps after creating them from data
  steps = scrollyContainer.querySelectorAll(".step");
}

function createScrollyContainer(scrollyContainerCount) {
  let scrollyContainer = document.createElement("div");
  scrollyContainer.classList.add("scrolly-container");
  scrollyContainer.dataset.stickyContainerId =
    "sticky-container-" + scrollyContainerCount;
  return scrollyContainer;
}

function createStickyContainers(scrollyContainerCount) {
  let stickyContainer = document.createElement("div");
  stickyContainer.id = "sticky-container-" + scrollyContainerCount;
  stickyContainer.classList.add("sticky-content");

  let imageContainer = document.createElement("div");
  //imageContainer.classList.add("sticky-content");
  imageContainer.id = "sticky-image-container";
  imageContainer.innerHTML = `<img id="the-sticky-image" />`;

  let mapContainer = document.createElement("div");
  //mapContainer.classList.add("sticky-content");
  mapContainer.id = "sticky-map-container";

  let videoContainer = document.createElement("div");
  //videoContainer.classList.add("sticky-content");
  videoContainer.id = "sticky-video-container";

  stickyContainer.appendChild(imageContainer);
  stickyContainer.appendChild(mapContainer);
  stickyContainer.appendChild(videoContainer);

  return stickyContainer;
}

function displayThenThrowError(stepError) {
  const errorMessage = document.getElementById("error-message");
  errorMessage.innerHTML = stepError.message;

  const errorAction = document.getElementById("error-action");
  errorAction.innerHTML = stepError.action;

  const errorHint = document.getElementById("error-hint");
  if (stepError.hint) {
    errorHint.innerHTML = stepError.hint;
    errorHint.style.display = "block";
  } else {
    errorHint.style.display = "none";
  }

  const errorContainer = document.getElementById("error-container");
  errorContainer.style.display = "flex"; // Show the error container

  // Since stepError a subclass of Error, we want to throw it after
  // we display the error in HTML so that the full stack trace is available
  // to the user in the console
  throw stepError;
}

// scrollama event handlers
function handleStepEnter(response) {
  var el = response.element;

  // Set active step state to is-active and all othe steps not active
  steps.forEach((step) => step.classList.remove("is-active"));
  el.classList.add("is-active");
  console.log("Step " + el.dataset.step + " entered");

  replaceStepStickyContent(el.dataset);
}

/* As we enter a step in the story, replace or modify the sticky content
   in HTML based on the step data
*/
function replaceStepStickyContent(stepData) {
  stickyImageContainer = document.querySelector("#sticky-image-container");
  stickyMapContainer = document.querySelector("#sticky-map-container");
  stickyVideoContainer = document.querySelector("#sticky-video-container");
  // activate the right container if it's different from previous step
  if (
    prevStepData == null ||
    prevStepData.contentType != stepData.contentType
  ) {
    transitionToNewStickyContentContainer(stepData.contentType);
  }

  // Replace the content in the sticky container
  if (stepData.contentType === "image") {
    displayStickyImage(stepData);
  } else if (stepData.contentType === "video") {
    displayStickyVideo(stepData);
  } else if (stepData.contentType === "map") {
    displayStickyMap(stepData.latitude, stepData.longitude, stepData.zoomLevel);
    addAltTextToMap(stepData.altText);
  }
  prevStepData = stepData;
}

function transitionToNewStickyContentContainer(activateContentType) {
  // Start fading out the old container (just do all of them).
  // We've set up a transition on opacity, so setting it to 0 or 1 will take
  // as long as specified in CSS. We can fade in the new content after that
  stickyMapContainer.style.opacity = 0;
  stickyImageContainer.style.opacity = 0;
  stickyVideoContainer.style.opacity = 0;

  stopPlayingVideo(); // in case video is playing, don't want to hear it after it scrolls off page

  // Fade in the new container after the opacity transition
  setTimeout(() => {
    switch (activateContentType) {
      case "image":
        stickyImageContainer.style.opacity = 1;
        stickyImageContainer.style.display = "flex";
        stickyVideoContainer.style.display = "none";
        stickyMapContainer.style.display = "none";
        break;
      case "map":
        stickyMapContainer.style.opacity = 1;
        stickyMapContainer.style.display = "block";
        stickyImageContainer.style.display = "none";
        stickyVideoContainer.style.display = "none";
        break;
      case "video":
        stickyVideoContainer.style.opacity = 1;
        stickyVideoContainer.style.display = "block";
        stickyImageContainer.style.display = "none";
        stickyMapContainer.style.display = "none";
        break;
    }
  }, transitionInMilliseconds);
}

function displayStickyImage(stepData) {
  const img = document.getElementById("the-sticky-image");

  // only replace sticky image if it has changed, to avoid flickering
  if (
    !prevStepData ||
    (stepData.filePath && prevStepData.filePath != stepData.filePath)
  ) {
    // Fade out the current image before changing the source
    // Note that this will double the transition when we are switching from
    // an image to a different content type because the containers also fade in/out
    // in that case, but that's ok, a longer transition is appropriate in that case
    img.style.opacity = 0;

    // fade in the image after the opacity transition
    setTimeout(() => {
      // Change the image source
      img.src = stepData.filePath;
      img.alt = stepData.altText;
      img.style.opacity = 1;
    }, transitionInMilliseconds);

    prevStepData = stepData.filePath;
  }
  if (stepData.zoomLevel) {
    img.style.transform = `scale(${stepData.zoomLevel})`;
  }
}

function displayStickyVideo(stepData) {
  stickyVideoContainer.innerHTML = `<iframe 
                id="the-iframe-video"
                src="${stepData.filePath}"
                frameborder="0"
                referrerpolicy="strict-origin-when-cross-origin"
                >
            </iframe>`;
  stickyVideoContainer.ariaLabel = stepData.altText;
  stickyVideoContainer.role = "tooltip";

  prevStepData = stepData.filePath;
}

function stopPlayingVideo() {
  // To properly do this, we'd have to know which streaming service, if any, is currently
  // playing and call a different API for each service to stop their player.
  // Instead, we'll just blank out the source of the video -- it will get loaded again the
  // next time a step is invoked.
  const iframe = document.getElementById("the-iframe-video");
  if (iframe != null) {
    iframe.src = "";
  }
}

function addAltTextToMap(altText) {
  const map = document.getElementById("sticky-map-container");
  map.setAttribute("aria-label", altText);
}

function initScrollama() {
  scroller
    .setup({
      step: ".scrolly-container .step",
      offset: 0.5, // what % from the top of the viewport the step should be considered "entered"
      debug: false,
    })
    .onStepEnter(handleStepEnter);

  // setup resize event
  window.addEventListener("resize", scroller.resize);
}
