/// <reference path="assist.ts"/>
/// <reference path="bounds.ts"/>
/// <reference path="coords.ts"/>
/// <reference path="intersections.ts"/>
/// <reference path="point.ts"/>
/// <reference path="shape.ts"/>
/// <reference path="circle.ts"/>
/// <reference path="polygon.ts"/>
/// <reference path="table.ts"/>
/// <reference path="draw.ts"/>
/// <reference path="mouse.ts"/>

//table setup
var table = new Table(<HTMLTableElement>document.getElementById("table"));
var nextIndex = 0;
//canvas setup
var canvas = document.getElementById("canvas") as HTMLCanvasElement;
canvas.addEventListener('mousemove', SetMousePosition, false);
canvas.addEventListener('mousedown', SaveIntersection, false);

//canvas vars
var ctx = canvas.getContext("2d");
var mouse: Mouse = new Mouse(0, 0);

//center of the screen
var center: Offset = new Offset(0, 0);

//Constant value to handle negative values (screen is 1/2 as high because upper half are positive and lower half are negative numbers)
//that's 0.5 and the -0.02 from that is to keep it from edges a bit
var scaler = 0.48;
var prevScale = 0;

//CACHED VALUES
//width or height of the canvas, which one is bigger
var maxSize: number;
//should save a nano second here and there
var halfWidth: number, halfHeight: number;
var intersections: ScaledCoord[] = [];

//settings
var horizontalIntersect = true;
var enableMouseLine = false;
var hideIntersections = false;
var closePolygon = false;

Rebuild();

//update 50 times per second
var updateInt = setInterval(Update, 20);

//OFTEN CALLED MAIN FUNCTIONS
async function Update() {
    var rcnt = RecountUpdate();
    changed = changed || mouse.CheckNearby(intersections);

    if (changed) {
        RecountIntersections(rcnt.scale, rcnt.offset);
        DrawUpdate(rcnt.scale, rcnt.offset);
    }

    if (mouse.inRange.length > 0)
        DrawCoords(ctx, mouse.inRange[0]);

    changed = false;
};

//Prepared for future optimalizations
function RecountUpdate() {
    var bounds = Bounds.GetEmpty();
    for (var i = 0; i < table.elements.length; i++)
        bounds.UpdateB(table.GetElement(i).value.bounds);

    var maxDist = Math.abs(bounds.maX);
    maxDist = ReturnAbsBigger(maxDist, bounds.maY);
    maxDist = ReturnAbsBigger(maxDist, bounds.miX);
    maxDist = ReturnAbsBigger(maxDist, bounds.miY);

    var scale = maxSize / maxDist;
    if (scale === Infinity)
        scale = maxSize / 2;

    return {
        scale: scale * scaler,
        offset: new Offset(halfWidth, halfHeight)
    };
}

//Prepared for future optimalizations
function DrawUpdate(scale: number, offset: Offset) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000000";
    //DrawCross();
    for (var i = 0; i < table.elements.length; i++)
        table.GetElement(i).value.Draw(ctx, scale, offset);


    for (var x = 0; x < intersections.length; x++)
        DrawIntesection(ctx, intersections[x], scale, offset);
    //console.log("redraw");
}

function RecountIntersections(scale: number, offset: Offset) {
    intersections.length = 0;
    for (var i = 0; i < table.elements.length; i++)
        for (var y = i + 1; y < table.elements.length; y++) {
            var r = table.elements[i].value.Collides(table.elements[y].value);
            for (var x = 0; x < r.length; x++)
                intersections.push(r[x].ScaleCoord(scale, offset));
        }
}

function DrawIntesection(ctx: CanvasRenderingContext2D, point: ScaledCoord, scale: number, offset: Offset) {
    ctx.beginPath();
    //var scaled = point.ScaleCoord(scale, offset);
    ctx.fillStyle = "#fff";
    ctx.arc(point.scaledX, point.scaledY, 5, 0, 2 * Math.PI, false);
    ctx.stroke();
    ctx.fill();
    //DrawRoundedRect(ctx, this.coord.ScaleCoord(scale, offset).drawCoords, 60, 30, 7, true, false);
}

function ReturnAbsBigger(currentVal, newVal) {
    var absCur = Math.abs(currentVal);
    var absNew = Math.abs(newVal);
    return absNew > absCur ? absNew : absCur;
}

function CheckLineIntersection(line1, line2) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        intersects: false
    };
    denominator = ((line2.end.y - line2.start.y) * (line1.end.x - line1.start.x)) - ((line2.end.x - line2.start.x) * (line1.end.y - line1.start.y));

    if (denominator == 0)
        return result;

    a = line1.start.y - line2.start.y;
    b = line1.start.x - line2.start.x;
    numerator1 = ((line2.end.x - line2.start.x) * a) - ((line2.end.y - line2.start.y) * b);
    numerator2 = ((line1.end.x - line1.start.x) * a) - ((line1.end.y - line1.start.y) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    if (b > 0 && b < 1 && a > 0 && a < 1) {
        result.intersects = true;
        result.x = line1.start.x + (a * (line1.end.x - line1.start.x));
        result.y = line1.start.y + (a * (line1.end.y - line1.start.y));
        //result.draw = ScaleToDraw(result);
    }

    return result;
}

function GetMouseLine() {
    /*if (horizontalIntersect)
        return {
            start: ScaleToOriginal({ x: halfWidth - halfMaxSize, y: mouse.y }),
            end: ScaleToOriginal({ x: halfWidth + halfMaxSize, y: mouse.y })
        };
    else
        return {
            start: ScaleToOriginal({ x: mouse.x, y: halfHeight - halfMaxSize }),
            end: ScaleToOriginal({ x: mouse.x, y: halfHeight + halfMaxSize })
        };*/
}

function IsMouseInRange(pos, radius) {
    var distanceVector = {
        x: Math.abs(mouse.x - pos.draw.x),
        y: Math.abs(mouse.y - pos.draw.y)
    };
    var distanceSqrd = distanceVector.x * distanceVector.x + distanceVector.y * distanceVector.y;
    return distanceSqrd < radius * radius;
}

//EVENTUALLY CALLED FUNCTIONS
function Rebuild() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    halfWidth = canvas.width / 2;
    halfHeight = canvas.height / 2;
    maxSize = canvas.width > canvas.height ? canvas.height : canvas.width;
    changed = true;
}


//EVENT FUNCTIONS
function SetMousePosition(event) {
    mouse.x = event.pageX;
    mouse.y = event.pageY;
};

function SaveIntersection() {
    //if (enableMouseLine)
    //savedILines.push(GetMouseLine());
}

function ClearAll() {
    //savedILines = [];
}

function CheckKey(event: KeyboardEvent) {
    var key = event.keyCode || event.charCode;
    //allowed keys are 1-9, backspace, delete and -
    return (key >= 48 && key <= 57) || key == 8 || key == 46 || key == 45;
};

function GenerateOption(name) {
    var option = document.createElement("option");
    option.text = name;
    return option;
};

function AddPolygon() {
    table.AddElement(new Polygon(ctx, Coord.zero));
}

function AddCircle() {
    table.AddElement(new Circle(ctx, Coord.zero, 1));
}

function AddPoint() {
    table.AddElement(new Point(ctx, Coord.zero));
}

//initialization
window.onresize = Rebuild;