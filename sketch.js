// Bakeoff #2 - Seleção de Alvos Fora de Alcance
// IPM 2021-22, Período 3
// Entrega: até dia 22 de Abril às 23h59 através do Fenix
// Bake-off: durante os laboratórios da semana de 18 de Abril

// p5.js reference: https://p5js.org/reference/

// Database (CHANGE THESE!)
const GROUP_NUMBER   = "43-TP";      // Add your group number here as an integer (e.g., 2, 3)
const BAKE_OFF_DAY   = false;  // Set to 'true' before sharing during the bake-off day

// Target and grid properties (DO NOT CHANGE!)
let PPI, PPCM;
let TARGET_SIZE;
let TARGET_PADDING, MARGIN, LEFT_PADDING, TOP_PADDING;
let continue_button;
let inputArea        = {x: 0, y: 0, h: 0, w: 0}    // Position and size of the user input area

// Metrics
let testStartTime, testEndTime;// time between the start and end of one attempt (54 trials)
let hits 			 = 0;      // number of successful selections
let misses 			 = 0;      // number of missed selections (used to calculate accuracy)
let database;                  // Firebase DB  

// Study control parameters
let draw_targets     = false;  // used to control what to show in draw()
let trials 			 = [];     // contains the order of targets that activate in the test
let current_trial    = 0;      // the current trial number (indexes into trials array above)
let attempt          = 0;      // users complete each test twice to account for practice (attemps 0 and 1)
let fitts_IDs        = [];     // add the Fitts ID for each selection here (-1 when there is a miss)
let hit_sound;
let miss_sound;
let snapped_mouse;

// Target class (position and width)
class Target
{
  constructor(x, y, w)
  {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}

class square_box {
  // Center coordinates of the square
  constructor(x, y, w) {
    this.x = x;
    this.y = y;
    this.w = w;
  }
}
bounds_squares = []


function initBoundSquares(w) {
  for ( i = 0; i < 18; i++) {
    target = getTargetBounds(i)
    next_s = new square_box(target.x, target.y, w);
    bounds_squares.push(next_s)
  }
}


function d_Bounds_Square() {

  for (i = 0; i < 18; i++) {
    noFill()
    strokeWeight(2);
    stroke(200, 200, 200);
    rectMode(CENTER);
    rect(bounds_squares[i].x, bounds_squares[i].y, bounds_squares[i].w);
    rectMode(CORNER);
  }

}

// Runs once at the start
function setup()
{
  // Sound Effects
  hit_sound = loadSound('assets/hit.mp3');
  miss_sound = loadSound('assets/miss.mp3');
  
  createCanvas(700, 500);    // window size in px before we go into fullScreen()
  frameRate(60);             // frame rate (DO NOT CHANGE!)
  
  randomizeTrials();         // randomize the trial order at the start of execution
  
  textFont("Arial", 18);     // font size for the majority of the text
  drawUserIDScreen();        // draws the user start-up screen (student ID and display size)
}

// Explains the target colors (captions)
function label() {




  stroke(color(255,255,255));
  strokeWeight(8);
  fill(color(0,255,0));
  circle(width/2 + 5 * TARGET_SIZE, height/8, TARGET_SIZE);

  stroke(color(255,255,255));
  strokeWeight(8);
  fill(color(255,0,0));
  circle(width/2 + TARGET_SIZE, height/8 + 2 * PPCM, TARGET_SIZE);


  fill(color(255,255,255));
  textAlign(CENTER, CENTER);
  fill(color(0,255,0))
  text("2X", width/2 + 5 * TARGET_SIZE, height/8);
  noStroke();
  textFont("Arial", 24);


  stroke(color(255,255,255));
  strokeWeight(8);
  fill(color(0,255,0));
  circle(width/2 + TARGET_SIZE, height/8, TARGET_SIZE);


  noStroke();
  textFont("Arial", 20); 
  fill(color(255,255,255));
  textAlign(LEFT, CENTER);
  text("DOUBLE TARGET", width/2 + 5.7 * TARGET_SIZE, height/8);

  text("TARGET", width/2 + 1.7 * TARGET_SIZE, height/8);

  text("NEXT TARGET", width/2 + 1.7 * TARGET_SIZE, height/8 + 2 * PPCM);



  textFont("Arial", 18); 
}

// Runs every frame and redraws the screen
function draw()
{
  if (draw_targets)
  {     
    // The user is interacting with the 6x3 target grid
    background(color(0,0,0));        // sets background to black
    
    // Print trial count at the top left-corner of the canvas
    fill(color(255,255,255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);
    
    
    // Draw all 18 targets
	for (var i = 0; i < 18; i++) drawTarget(i);
    
    // Draw the user input area
    drawInputArea()
    
    // Draw the captions
    label();
    
    // Draw the virtual cursor
    let x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
    let y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)
    
    x = constrain(x, getTargetBounds(0).x, getTargetBounds(2).x);
    y = constrain(y, getTargetBounds(0).y, getTargetBounds(15).y);
    
    s1 = dist(getTargetBounds(0).x, getTargetBounds(0).y, getTargetBounds(1).x, getTargetBounds(1).y) // distance between 2 targets
    initBoundSquares(s1);
    d_Bounds_Square();
    
    snapped_mouse = SnapTargetId(x, y);

    fill(color(255,255,255));
    circle(getTargetBounds(snapped_mouse).x, getTargetBounds(snapped_mouse).y, 0.5 * PPCM);
    
    fill(color(255,255,255));
    circle(x, y, 0.5 * PPCM);
  }
}

// Get the target closest to the virtual mouse and aims for the center of the target
function SnapTargetId(x, y) {

  let target_id = 0;
  let distance = 5000; 

  for (var i = 0; i < 18; i++) {
    if (dist(x, y, getTargetBounds(i).x, getTargetBounds(i).y) < distance) {
      target_id = i;
      distance = dist(x, y, getTargetBounds(i).x, getTargetBounds(i).y);
    }

  }
  return target_id;
}

// Print and save results at the end of 54 trials
function printAndSavePerformance()
{
  // DO NOT CHANGE THESE! 
  let accuracy			= parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time         = (testEndTime - testStartTime) / 1000;
  let time_per_target   = nf((test_time) / parseFloat(hits + misses), 0, 3);
  let penalty           = constrain((((parseFloat(95) - (parseFloat(hits * 100) / parseFloat(hits + misses))) * 0.2)), 0, 100);
  let target_w_penalty	= nf(((test_time) / parseFloat(hits + misses) + penalty), 0, 3);
  let timestamp         = day() + "/" + month() + "/" + year() + "  " + hour() + ":" + minute() + ":" + second();
  
  background(color(0,0,0));   // clears screen
  fill(color(255,255,255));   // set text fill color to white
  text(timestamp, 10, 20);    // display time on screen (top-left corner)
  
  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width/2, 60); 
  text("Hits: " + hits, width/2, 100);
  text("Misses: " + misses, width/2, 120);
  text("Accuracy: " + accuracy + "%", width/2, 140);
  text("Total time taken: " + test_time + "s", width/2, 160);
  text("Average time per target: " + time_per_target + "s", width/2, 180);
  text("Average time for each target (+ penalty): " + target_w_penalty + "s", width/2, 220);
  
  // Print Fitts IDS (one per target, -1 if failed selection, optional)
  text("Fitts Index of Performance", width/2, 260);
  for (var i = 0; i < current_trial; i++)
  {
    if(i === 0)
        text("Target " + (i + 1) + ": ---", width / 3, 300 + (i * 20));
    else if (i < 27)
    {
      if (fitts_IDs[i] === -1)
        text("Target " + (i + 1) + ": MISSED", width / 3, 300 + (i * 20));
      else
        text("Target " + (i + 1) + ": " + fitts_IDs[i], width /  3, 300 + (i * 20));
    }
    else
    {
      if (fitts_IDs[i] === -1)
        text("Target " + (i + 1) + ": MISSED",2 * width / 3, 300 + ((i - 27) * 20));
      else
        text("Target " + (i + 1) + ": " + fitts_IDs[i], 2 * width / 3, 300 + ((i - 27) * 20));
    }
  }

  // Saves results (DO NOT CHANGE!)
  let attempt_data = 
  {
        project_from:       GROUP_NUMBER,
        assessed_by:        student_ID,
        test_completed_by:  timestamp,
        attempt:            attempt,
        hits:               hits,
        misses:             misses,
        accuracy:           accuracy,
        attempt_duration:   test_time,
        time_per_target:    time_per_target,
        target_w_penalty:   target_w_penalty,
        fitts_IDs:          fitts_IDs
  }
  
  // Send data to DB (DO NOT CHANGE!)
  if (BAKE_OFF_DAY)
  {
    // Access the Firebase DB
    if (attempt === 0)
    {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }
    
    // Add user performance results
    let db_ref = database.ref('G' + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() 
{
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets)
  {
    // Get the location and size of the target the user should be trying to select
    let target = getTargetBounds(trials[current_trial]);   
    let last_target = getTargetBounds(trials[current_trial - 1]);
    
    // Check to see if the virtual cursor is inside the target bounds,
    // increasing either the 'hits' or 'misses' counters
        
    if (insideInputArea(mouseX, mouseY))
    {
      let virtual_x = map(mouseX, inputArea.x, inputArea.x + inputArea.w, 0, width)
      let virtual_y = map(mouseY, inputArea.y, inputArea.y + inputArea.h, 0, height)
      
      virtual_x = constrain(virtual_x, getTargetBounds(0).x, getTargetBounds(2).x);
      virtual_y = constrain(virtual_y, getTargetBounds(0).y, getTargetBounds(15).y)
      
        // Calculate the distance between targets
      let distance;
      if (current_trial === 0) {
        distance = dist(virtual_x, virtual_y, 0, 0);
      }
      else {
        distance = dist(virtual_x, virtual_y, last_target.x, last_target.y);
      }
      
      let fitts_ID = Math.log2((distance / last_target.w) + 1);
      
      if (dist(target.x, target.y, getTargetBounds(snapped_mouse).x, getTargetBounds(snapped_mouse).y) < target.w/2) {
        hits++;
        hit_sound.play();
        fitts_IDs[current_trial] = round(fitts_ID, 3);
      } 
      else {
        misses++;
        miss_sound.play()
        fitts_IDs[current_trial] = -1;
      }
      
      current_trial++;                 // Move on to the next trial/target
    }
    // Check if the user has completed all 54 trials
    if (current_trial === trials.length)
    {
      testEndTime = millis();
      draw_targets = false;          // Stop showing targets and the user performance results
      printAndSavePerformance();     // Print the user's results on-screen and send these to the DB
      attempt++;                      

      // If there's an attempt to go create a button to start this
      if (attempt < 2)
      {
        continue_button = createButton('START 2ND ATTEMPT');
        continue_button.mouseReleased(continueTest);
        continue_button.position(width/2 - continue_button.size().width/2, height/2 - continue_button.size().height/2);
      }
    }
    // Check if this was the first selection in an attempt
    else if (current_trial === 1) 
    {testStartTime = millis();
    }

     
  }
}

// Draw target on-screen
function drawTarget(i)
{
  // Get the location and size for target (i)
  let target = getTargetBounds(i);             
  // Get the location and size for next target (i)
  let next = getTargetBounds(trials[current_trial+1]);
  // Check whether this target is the target the user should be trying to select
  if (trials[current_trial] === i) 
  { 
    fill(color(0,255,0)); 
    // Highlights the target the user should be trying to select
    // with a white border
    stroke(color(255,255,255));
    strokeWeight(8);
    circle(target.x, target.y, target.w);
    
    // Remember you are allowed to access targets (i-1) and (i+1)
    // if this is the target the user should be trying to select
    //
  // Next target
    if (trials[current_trial + 1] === i) {
      text("2x", getTargetBounds(i).x - 10, getTargetBounds(i).y + 10);
      textAlign(CENTER);
      noStroke();
      textFont("Arial", 24);
    }
      
    fill(color(0,255,0));
    // Draw a line
    if (trials[current_trial] !== trials[current_trial + 1]) {
      stroke(255, 255, 255);
      strokeWeight(8);
      line(target.x, target.y, next.x, next.y);
    }
      
  }
  // Does not draw a border if this is not the target the user
  // should be trying to select
  else {
    noStroke();
    fill(color(0,41,110));
    stroke(color(255,255,255));
    strokeWeight(2);
    circle(target.x, target.y, target.w);
    
    if (trials[current_trial + 1] === i) {

      fill(color(255,0,0));                 
      circle(next.x, next.y, next.w);
    }
  }
    // Draws the target in the box
    let box_x = map(target.x, 0, width, inputArea.x, inputArea.x + inputArea.w);
    let box_y = map(target.y, 0, height, inputArea.y, inputArea.y + inputArea.h);
    
    //if (trials[current_trial + 1] === i && trials[current_trial] === i) {
      //stroke(color(255,255,255));
      //text("2x", box_x, box_y);
      //textAlign(CENTER);
      //textFont("Arial", 24);
    //}
  
    rectMode(CENTER);
    square(box_x, box_y, target.w * (inputArea.w/height));
    rectMode(CORNER);
  
    if ((trials[current_trial] === trials[current_trial + 1]) && (i === trials[current_trial])) {
        fill(color(255,255,255));
        textAlign(CENTER,CENTER);
        text("2X", box_x, box_y + 0.1*PPCM);
        noStroke();
      textFont("Arial", 24);
    }
}

// Returns the location and size of a given target
function getTargetBounds(i)
{
  var x = parseInt(LEFT_PADDING) + parseInt((i % 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);
  var y = parseInt(TOP_PADDING) + parseInt(Math.floor(i / 3) * (TARGET_SIZE + TARGET_PADDING) + MARGIN);

  return new Target(x, y, TARGET_SIZE);
}

// Evoked after the user starts its second (and last) attempt
function continueTest()
{
  // Re-randomize the trial order
  shuffle(trials, true);
  current_trial = 0;
  print("trial order: " + trials);
  
  // Resets performance variables
  hits = 0;
  misses = 0;
  fitts_IDs = [];
  
  continue_button.remove();
  
  // Shows the targets again
  draw_targets = true;
  testStartTime = millis();  
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() 
{
  resizeCanvas(windowWidth, windowHeight);
    
  let display    = new Display({ diagonal: display_size }, window.screen);

  // DO NOT CHANGE THESE!
  PPI            = display.ppi;                        // calculates pixels per inch
  PPCM           = PPI / 2.54;                         // calculates pixels per cm
  TARGET_SIZE    = 1.5 * PPCM;                         // sets the target size in cm, i.e, 1.5cm
  TARGET_PADDING = 1.5 * PPCM;                         // sets the padding around the targets in cm
  MARGIN         = 1.5 * PPCM;                         // sets the margin around the targets in cm

  // Sets the margin of the grid of targets to the left of the canvas (DO NOT CHANGE!)
  LEFT_PADDING   = width/3 - TARGET_SIZE - 1.5 * TARGET_PADDING - 1.5 * MARGIN;        

  // Sets the margin of the grid of targets to the top of the canvas (DO NOT CHANGE!)
  TOP_PADDING    = height/2 - TARGET_SIZE - 3.5 * TARGET_PADDING - 1.5 * MARGIN;
  
  // Defines the user input area (DO NOT CHANGE!)
  inputArea      = {x: width/2 + 2 * TARGET_SIZE,
                    y: height/2,
                    w: width/3,
                    h: height/3
                   }

  // Starts drawing targets immediately after we go fullscreen
  draw_targets = true;
}

// Responsible for drawing the input area
function drawInputArea()
{
  noFill();
  stroke(color(255,255,255));
  strokeWeight(2);
  
  rect(inputArea.x, inputArea.y, inputArea.w, inputArea.h);
}