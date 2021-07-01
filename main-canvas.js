const MainCanvas = (() => {

    const FPS = 60;
    const DELTA_TIME = 1000 / FPS;
    const SNAPPING_DISTANCE = 150;

    let isWeighing = false;
    let _count = 0;

    class DrawableRect {
        constructor(pivotX, pivotY, width, height) {
            this.pivot = { x: pivotX, y: pivotY };
            this.width = width;
            this.height = height;
            this.color = null;
            console.log(`pivot {${this.pivot.x} ${this.pivot.y}}`);
        }
        
        draw(ctx, angle = 0) {
            ctx.translate(this.pivot.x, this.pivot.y);
            ctx.rotate(angle);
            if (this.color == null) {
                ctx.beginPath();
                ctx.rect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.stroke();
            } else {
                ctx.fillStyle = this.color;
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            }
            ctx.rotate(-angle);
            ctx.translate(-this.pivot.x, -this.pivot.y);
        }
        
        moveTo(point) {
            this.pivot = point;
        }
    }

    class Scale extends DrawableRect {
        constructor() {
            super(400, 200, 300, 50);
            this.panOffsetX = this.width / 2 - 25;
            this.panOffsetY = 200;
            this.leftScalePan = new ScalePan(this.pivot.x - this.panOffsetX,
                this.pivot.y + this.panOffsetY);
            this.rightScalePan = new ScalePan(this.pivot.x + this.panOffsetX,
                this.pivot.y + this.panOffsetY);
            this.stand = new DrawableRect(this.pivot.x, this.pivot.y + 150, 50, 300);
            this.stand.color = "black";
            this.angle = 0;
            this.angleMax = 15 * Math.PI / 180;
            this.angularVelocity = 0;
            this.color = "black";
            
            // lines
            this.linesWidth = 100;
            this.ll = { x: 0, y: 0 };
            this.lr = { x: 0, y: 0 };
            this.lt = { x: 0, y: 0 };
            this.rl = { x: 0, y: 0 };
            this.rr = { x: 0, y: 0 };
            this.rt = { x: 0, y: 0 };
        }

        rotate() {
            let offsetX = this.panOffsetX * Math.cos(this.angle);
            let offsetY = this.panOffsetX * Math.sin(this.angle);

            let lx = this.pivot.x - offsetX;
            let ly = this.pivot.y - offsetY + this.panOffsetY; 
            let rx = this.pivot.x + offsetX
            let ry = this.pivot.y + offsetY + this.panOffsetY; 

            this.leftScalePan.moveTo({ x: lx, y: ly });
            this.rightScalePan.moveTo({ x: rx, y: ry });
            
            this.ll = { x: lx - this.linesWidth / 2, y : ly };
            this.lr = { x: lx + this.linesWidth / 2, y : ly };
            this.lt = { x: lx, y: ly - this.panOffsetY };
            this.rl = { x: rx - this.linesWidth / 2, y : ry };
            this.rr = { x: rx + this.linesWidth / 2, y : ry };
            this.rt = { x: rx, y: ry - this.panOffsetY };
            

            if (!isWeighing)//////
                return;
            const diff = this.rightScalePan.getMass() - this.leftScalePan.getMass();
            this.angularVelocity = 0.001; // fine tuned arbitrary value
            let deltaAngle = this.angularVelocity * DELTA_TIME;
            if (diff == 0) {
                if (-0.01 <= this.angle && this.angle <= 0.01)
                    this.angle = 0;
                else
                    this.angle -= (this.angle > 0)? deltaAngle : -deltaAngle;
            } else {
                this.angle += (diff > 0)? deltaAngle : -deltaAngle;
            }
            if (this.angle < -this.angleMax)
                this.angle = -this.angleMax;
            if (this.angle > this.angleMax)
                this.angle = this.angleMax;
        }

        draw(ctx) {
            super.draw(ctx, this.angle);
            this.stand.draw(ctx);
            this.leftScalePan.draw(ctx);
            this.rightScalePan.draw(ctx);

            ctx.fillStyle = this.color;
            ctx.lineWidth = 4;
            // left
            ctx.beginPath();
            ctx.moveTo(this.ll.x, this.ll.y);
            ctx.lineTo(this.lt.x, this.lt.y);
            ctx.lineTo(this.lr.x, this.lr.y);
            ctx.stroke();
            // right
            ctx.beginPath();
            ctx.moveTo(this.rl.x, this.rl.y);
            ctx.lineTo(this.rt.x, this.rt.y);
            ctx.lineTo(this.rr.x, this.rr.y);
            ctx.stroke();
        }
    }

    class ScalePan extends DrawableRect {
        constructor(pivotX, pivotY) {
            super(pivotX, pivotY, 100, 10);
            this.weights = [];
            this._slots = [
                { x: 0, y: -30 },
                { x: 0, y: -80 },
                { x: 0, y: -130 }
            ];
            this.color = "black";
        }

        getSlot(index) {
            let x = this._slots[index].x;
            x += this.pivot.x;
            let y = this._slots[index].y;
            y += this.pivot.y;
            return {x, y};
        }

        put(weight) {
            this.weights.push(weight);
            const index = this.weights.length - 1;
            this.weights[index].moveTo(this.getSlot(index));
        }

        takeOff(weight) {
            const index = this.weights.indexOf(weight);
            console.log(`index ${index} ${weight.mass}, 
                ${this.weights[0]?.mass} ${this.weights[1]?.mass} ${this.weights[2]?.mass}`);
            if (index > -1)
                this.weights.splice(index, 1);
            else
                console.log("weight is not on the pan");

            this.arrangeWeights();
        }

        arrangeWeights() {
            for (let i = 0; i < this.weights.length; i++)
                this.weights[i].moveTo(this.getSlot(i));
        }

        getMass() {
            let sum = 0;
            for (let i = 0; i < this.weights.length; i++)
                sum += this.weights[i].mass;
            return sum;
        }

        moveTo(pos) {
            super.moveTo(pos);
            this.arrangeWeights();
        }
    }

    class Weight extends DrawableRect {
        constructor(x, y, id, weight) {
            super(x, y, 50, 50);
            this.mass = weight;
            this.id = id;
            this.putOn = null;
            console.log(`weight: ${this.mass}`);
        }
        
        contains(x, y) {
            let leftEdge = this.pivot.x - this.width / 2;
            let rightEdge = this.pivot.x + this.width / 2;
            let topEdge = this.pivot.y - this.height / 2;
            let bottomEdge = this.pivot.y + this.height / 2;
            console.log(`x: ${x} y: ${y} l:${leftEdge} r: ${rightEdge} u: ${topEdge} b: ${bottomEdge}`);
            return leftEdge <= x && x <= rightEdge &&
                topEdge <= y && y <= bottomEdge;
        }

        draw(ctx) {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pivot.x, this.pivot.y, this.height / 2, 0, 2 * Math.PI);
            ctx.fill();
        }
   }

    function canvasOffset(point) {
        const rect = canvas.getBoundingClientRect();
        let x = point.x - rect.left;
        let y = point.y - rect.top;
        return {x, y};
    }

    function distance(pointA, pointB) {
        const deltaX = pointB.x - pointA.x;
        const deltaY = pointB.y - pointA.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
        

    let canvas;
    let counter;
    let weighButton;
    let stopWeighingButton;
    let different = Math.floor(Math.random() * 3);
    let scale;
    let weightA;
    let weightB;
    let weightC;
    let slotsFree = [
        { x: 50, y: 550 },
        { x: 120, y: 550 },
        { x: 190, y: 550}
    ];

    let isMouseDown = false;
    let clicked = null;
    function mouseDown(e) {
        if (isWeighing)////////////
            return;
        const point = canvasOffset({x: e.clientX, y: e.clientY});
        console.log(`mouse down ${e.clientX} ${e.clientY}, ${point.x} ${point.y}`);
        isMouseDown = true;
        if (weightA.contains(point.x, point.y)) {
            console.log("clicked A");
            clicked = weightA;
        } else if (weightB.contains(point.x, point.y)) {
            console.log("clicked B");
            clicked = weightB;
        } else if (weightC.contains(point.x, point.y)) {
            console.log("clicked C");
            clicked = weightC;
        }
    }

    function mouseUp() {
        if (isWeighing)///////////
            return;
        console.log(`releast ${clicked}`);
        if (clicked) {
            if (clicked.putOn == null) {
                // snap to scale pan if near
                if (distance(clicked.pivot, scale.leftScalePan.pivot) <= SNAPPING_DISTANCE) {
                    console.log("snap to left pan");
                    scale.leftScalePan.put(clicked);
                    clicked.putOn = scale.leftScalePan;
                } else if (distance(clicked.pivot, scale.rightScalePan.pivot) <= SNAPPING_DISTANCE) {
                    console.log("snap to right pan");
                    scale.rightScalePan.put(clicked);
                    clicked.putOn = scale.rightScalePan;
                } else
                    clicked.moveTo(slotsFree[clicked.id]);
            } else {
                // take off the pan
                console.log("take off the pan");
                clicked.moveTo(slotsFree[clicked.id]);
                clicked.putOn.takeOff(clicked);
                clicked.putOn = null;
            }
        }
        isMouseDown = false;
        clicked = null;
    }

    function onMouseMove(e) {
        if (isWeighing)/////////////
            return;
        if (isMouseDown) {
            if (clicked && !clicked?.isSnapped) {
                const point = canvasOffset({x: e.clientX, y: e.clientY});
                clicked.moveTo(point);
            }
        }
    }

    function increamentCount() {
        _count++;
        counter.innerHTML = `ważenia: ${_count}`;
    }

    return {
        weigh: () => {
            if (isWeighing)
                return;
            console.log("weigh");
            let body = document.getElementsByTagName("body")[0];
            body.style.backgroundColor = "#E0E0E0";
            canvas.style.boxShadow = "0 0 20px 0 rgba(0, 0, 0, 0.8)";
            weighButton.disabled = true;
            stopWeighingButton.disabled = false;
            increamentCount();
            isWeighing = true;
        },
        stopWeighing: () => {
            if (!isWeighing)
                return;
            console.log("stop weighing");
            let body = document.getElementsByTagName("body")[0];
            body.style.backgroundColor = "white";
            canvas.style.boxShadow = "";
            weighButton.disabled = false;
            stopWeighingButton.disabled = true;
            isWeighing = false;
        },
        draw: () => {
            let ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            scale.draw(ctx);
            weightA.draw(ctx);
            weightB.draw(ctx);
            weightC.draw(ctx);
        },
        start: () => {
            counter = document.getElementById("weigh-count");
            counter.innerHTML = "ważenia: 0";

            weighButton = document.getElementById("weigh-button");
            stopWeighingButton = document.getElementById("stop-weighing-button");
            stopWeighingButton.disabled = true;

            canvas = document.getElementById("main-canvas");

            scale = new Scale();
            setInterval(() => {scale.rotate(); }, DELTA_TIME);

            console.log(`different: ${different}`);
            let diffMass = (Math.floor(Math.random() * 2) == 0) ? 1 : 3;
            weightA = new Weight(slotsFree[0].x, slotsFree[0].y, 0, (different == 0) ? diffMass : 2);
            weightA.color = "red";
            weightB = new Weight(slotsFree[1].x, slotsFree[1].y, 1, (different == 1) ? diffMass : 2);
            weightB.color = "green";
            weightC = new Weight(slotsFree[2].x, slotsFree[2].y, 2, (different == 2) ? diffMass : 2);
            weightC.color = "blue";

            canvas.addEventListener("mousedown", mouseDown);
            canvas.addEventListener("mouseup", mouseUp);
            canvas.onmousemove = onMouseMove;
            setInterval(MainCanvas.draw, DELTA_TIME);
        },
        reset: () => {
            location.reload();
        },
        check: () => {
            let dropdown = document.getElementById("answer");
            console.log(`check ${dropdown.value}`);
            if (dropdown.value == different)
                alert("Poprawna odpowiedź! <3");
            else
                alert("Zła odpowiedź :(");
        }
    }
})();

window.addEventListener("load", MainCanvas.start);
