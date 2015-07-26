   var table = document.getElementById("table");
   var nextIndex = 0;

   //canvas setup
   var canvas = document.getElementById("canvas");
   canvas.addEventListener('mousemove', SetMousePosition, false);
   canvas.addEventListener('mousedown', SaveIntersection, false);

   Rebuild();
   var ctx = canvas.getContext("2d");

   var scale, maxSize, halfMaxSize, mouseX, mouseY, halfWidth, halfHeight;
   var horizontalIntersect = true;
   var enableMouseLine = true;
   var hideIntersections = false;

   var savedILines = [];

   //set for 50fps
   setInterval(Update, 20);

   function CheckKey(event) {
       var key = event.keyCode || event.charCode;
       //allowed keys are 1-9, backspace, delete and -
       return (key >= 48 && key <= 57) || key == 8 || key == 46 || key == 45;
   };

   function AddPoint() {
       var row = table.insertRow();
       row.dataset.id = ++nextIndex;

       //insert cells
       var cell1 = row.insertCell(0);
       var cell2 = row.insertCell(1);
       var cell3 = row.insertCell(2);

       //fill cells
       cell1.innerHTML = "<input type='text' onkeypress='return CheckKey(event)' value='0'>";
       cell2.innerHTML = "<input type='text' onkeypress='return CheckKey(event)' value='0'>";
       cell3.innerHTML = "<button class='mdl-button mdl-js-button mdl-button--icon mdl-button--colored' onclick='RemovePoint(" + nextIndex + ")'> <i class='material-icons'>remove</i></button>";
   };

   function RemovePoint(index) {
       for (var i = 0; i < table.rows.length; i++) {
           if (table.rows[i].dataset.id == index) {
               table.deleteRow(i);
               break;
           }
       }
   };

   function Rebuild() {
       canvas.width = window.innerWidth;
       canvas.height = window.innerHeight;
       halfWidth = canvas.width / 2;
       halfHeight = canvas.height / 2;
       maxSize = canvas.width > canvas.height ? canvas.height : canvas.width;
       halfMaxSize = maxSize / 2;

   };

   function Update() {
       ctx.clearRect(0, 0, canvas.width, canvas.height);
       ctx.strokeStyle = "#000000";
       var array = [];
       scale = 9999;

       for (var i = 1; i < table.rows.length; i++) {
           var posX = parseFloat(table.rows[i].cells[0].children[0].value);
           var posY = parseFloat(table.rows[i].cells[1].children[0].value);

           if (posX != 0) {
               scaleX = maxSize / Math.abs(posX);
               if (scaleX < scale) scale = scaleX;
           }

           if (posY != 0) {
               scaleY = maxSize / Math.abs(posY);
               if (scaleY < scale) scale = scaleY;
           }

           array.push(ModifyPosition({
               x: posX,
               y: posY
           }));
       }


       DrawBase();
       if (array.length > 1) {
           array.push(array[0]);

           DrawLines(array);

           if (!hideIntersections)
               DrawIntersections(array);
       }
   };

   //Draws the base cross
   function DrawBase() {
       ctx.strokeStyle = "#ccc";
       ctx.lineWidth = 1;

       ctx.beginPath();
       ctx.moveTo(halfWidth, halfHeight - halfMaxSize);
       ctx.lineTo(halfWidth, halfHeight + halfMaxSize);
       ctx.stroke();
       ctx.closePath();

       ctx.beginPath();
       ctx.moveTo(halfWidth - halfMaxSize, halfHeight);
       ctx.lineTo(halfWidth + halfMaxSize, halfHeight);
       ctx.stroke();
       ctx.closePath();
   };

   function DrawLines(array) {
       ctx.strokeStyle = "#000";
       ctx.lineWidth = 2;

       for (var i = 0; i < array.length - 1; i++) {
           ctx.beginPath();
           ctx.moveTo(array[i].x, array[i].y);
           ctx.lineTo(array[i + 1].x, array[i + 1].y);
           ctx.stroke();
       }
   };

   //Modifies positions to better fit display
   function ModifyPosition(position) {
       var halfScale = scale * 0.48;
       return {
           x: position.x * halfScale + halfWidth,
           y: -position.y * halfScale + halfHeight
       };
   };

   function DrawIntersections(array) {
       for (var i = 0; i < savedILines.length; i++)
           DrawIntersection(savedILines[i], array);

       if (enableMouseLine)
           DrawIntersection(GetMouseLine(), array);
   }

   function DrawIntersection(iLine, array) {
       var intersections = [];
       //Go through every item in array and check if it intersects with mouse line
       for (var i = 0; i < array.length - 1; i++) {
           var line = {
               startX: array[i].x,
               startY: array[i].y,
               endX: array[i + 1].x,
               endY: array[i + 1].y
           }

           var result = CheckLineIntersection(iLine, line);

           if (result.intersects)
               intersections.push(result);
       }

       //if intersections found, draw
       if (intersections.length > 0) {
           //draws base line for the intersections
           ctx.beginPath();
           ctx.lineWidth = 2;
           ctx.setLineDash([10]);
           ctx.moveTo(iLine.startX, iLine.startY);
           ctx.lineTo(iLine.endX, iLine.endY);
           ctx.strokeStyle = '#9297B5';
           ctx.stroke();
           ctx.setLineDash([0]);

           //draw every intersection point found
           for (var i = 0; i < intersections.length; i++) {
               ctx.beginPath();
               console.log("ran");
               var radius = IsMouseInRange(intersections[i], 20) ? 10 : 5;
               ctx.arc(intersections[i].x, intersections[i].y, radius, 0, 2 * Math.PI, false);
               ctx.fillStyle = '#3F51B5';
               ctx.fill();
               ctx.lineWidth = 3;
               ctx.stroke();
           }
       }
   };

   function IsMouseInRange(pos, radius) {
       var distanceVector = {
           x: Math.abs(mouseX - pos.x),
           y: Math.abs(mouseY - pos.y)
       };
       var distanceSqrd = distanceVector.x * distanceVector.x + distanceVector.y * distanceVector.y;
       console.log(distanceSqrd);
       return distanceSqrd < radius * radius;
   }

   function GetMouseLine() {
       if (horizontalIntersect)
           return {
               startX: halfWidth - halfMaxSize,
               endX: halfWidth + halfMaxSize,
               startY: mouseY,
               endY: mouseY
           };
       else
           return {
               startX: mouseX,
               endX: mouseX,
               startY: halfHeight - halfMaxSize,
               endY: halfHeight + halfMaxSize
           };
   }

   function CheckLineIntersection(line1, line2) {
       // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
       var denominator, a, b, numerator1, numerator2, result = {
           x: null,
           y: null,
           intersects: false
       };
       denominator = ((line2.endY - line2.startY) * (line1.endX - line1.startX)) - ((line2.endX - line2.startX) * (line1.endY - line1.startY));
       if (denominator == 0) {
           return result;
       }
       a = line1.startY - line2.startY;
       b = line1.startX - line2.startX;
       numerator1 = ((line2.endX - line2.startX) * a) - ((line2.endY - line2.startY) * b);
       numerator2 = ((line1.endX - line1.startX) * a) - ((line1.endY - line1.startY) * b);
       a = numerator1 / denominator;
       b = numerator2 / denominator;

       // if we cast these lines infinitely in both directions, they intersect here:
       result.x = line1.startX + (a * (line1.endX - line1.startX));
       result.y = line1.startY + (a * (line1.endY - line1.startY));

       // if line2 is a segment and line1 is infinite, they intersect if:
       if (b > 0 && b < 1 && a > 0 && a < 1) {
           result.intersects = true;
       }
       // if line1 and line2 are segments, they intersect if both of the above are true
       return result;
   };

   //onmove sets mouse position
   function SetMousePosition(event) {
       mouseX = event.pageX;
       mouseY = event.pageY;
   };

   function SaveIntersection() {
       if (enableMouseLine)
           savedILines.push(GetMouseLine());
   }