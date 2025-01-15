import { fetchDataFromGoogleSheet } from "./google-sheet.js";

// Defines all the data needed for a step
export class StepData {
  constructor(ContentType, FilePath, Latitude, Longitude, ZoomLevel, Text) {
    this.ContentType = ContentType;
    this.FilePath = FilePath;
    this.Latitude = Latitude;
    this.Longitude = Longitude;
    this.ZoomLevel = ZoomLevel;
    this.Text = Text;
  }
}

let main = null;
let scrolly = null;
let stickyImage = null;
let prevStickyImage = null;
let stickyMap = null;
let story = null;
let steps = null;

// initialize the scrollama
let scroller = scrollama();

document.addEventListener("DOMContentLoaded", async function () {
  main = document.querySelector("main");
  scrolly = main.querySelector("#scrolly-container");
  stickyImage = scrolly.querySelector("#sticky-image");
  stickyMap = scrolly.querySelector("#sticky-map");
  story = scrolly.querySelector("article");

  //createScrollyContentFromCSVFile();
  const stepDataArray = await fetchDataFromGoogleSheet();
  createScrollyContentFromCSVData(stepDataArray);
});

function createScrollyContentFromCSVData(stepDataArray) {
  console.log("allStepData: " + JSON.stringify(stepDataArray));

  var stepNumber = 1;
  stepDataArray.forEach((stepData) => {
    var stepElement = document.createElement("div");
    stepElement.classList.add("step");
    stepElement.dataset.step = stepNumber;
    stepElement.dataset.contentType = stepData.ContentType;
    if (stepData.FilePath) {
      stepElement.dataset.filePath = stepData.FilePath;
    }
    if (stepData.Latitude) {
      stepElement.dataset.latitude = stepData.Latitude;
    }
    if (stepData.Longitude) {
      stepElement.dataset.longitude = stepData.Longitude;
    }
    if (stepData.ZoomLevel) {
      stepElement.dataset.zoomLevel = stepData.ZoomLevel;
    }

    stepElement.innerHTML = `<p>${stepData.Text}</p>`;
    story.appendChild(stepElement);
    stepNumber++;
  });

  // re-query the steps after creating them from CSV data
  steps = story.querySelectorAll(".step");

  // initialize scrollama only after the scrolly content has been created
  initScrollama();
}

function isParseError(parseErrors, papaErrors) {
  return false;
}

function displayErrors(errors) {
  console.error("Errors parsing CSV file: " + JSON.stringify(errors));

  var errorContainer = document.createElement("div");
  errorContainer.classList.add("error-container");
  errors.forEach((error) => {
    var errorElement = document.createElement("p");
    errorElement.textContent = `Parse File Error: ${JSON.stringify(error)}`;
    //errorElement.textContent = `Parse File Error: ${String(error)}`;
    errorContainer.appendChild(errorElement);
  });
  document.body.prepend(errorContainer);
}

// scrollama event handlers
function handleStepEnter(response) {
  var el = response.element;

  // Set active step state to is-active and all othe steps not active
  steps.forEach((step) => step.classList.remove("is-active"));
  el.classList.add("is-active");

  replaceStepContent(el.dataset);
}

function replaceStepContent(stepData) {
  // Swap out image or map based on meta data
  if (stepData.contentType === "image") {
    // only replace the <img> tag if the image has changed, to allow for smooth transitions
    if (stepData.filePath && prevStickyImage != stepData.filePath) {
      stickyImage.innerHTML = `<img src="${stepData.filePath}" alt="Image Alt Text" />`;
      prevStickyImage = stepData.filePath;

      stickyImage.style.display = "block"; // TODO Move to CSS, create an active/inactive class
      stickyMap.style.display = "none";
    }
    if (stepData.zoomLevel) {
      let img = stickyImage.querySelector("img");
      if (img) {
        img.style.transform = `scale(${stepData.zoomLevel})`;
      }
    }
  } else if (stepData.contentType === "map") {
    stickyImage.style.display = "none"; // TODO Move to CSS, create an active/inactive class
    stickyMap.style.display = "block";
    displayStickyMap(stepData.latitude, stepData.longitude, stepData.zoomLevel);
  }
}

function initScrollama() {
  scroller
    .setup({
      step: "#scrolly-container article .step",
      offset: 0.5, // what % from the top of the viewport the step should be considered "entered"
      debug: false,
    })
    .onStepEnter(handleStepEnter);

  // setup resize event
  window.addEventListener("resize", scroller.resize);
}
