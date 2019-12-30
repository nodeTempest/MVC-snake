//
//
//
//
//
//
//
//
//
//
//
//
//
//
import "./index.css";

import EventEmitter from "events";
import _ from "lodash";

interface coords {
  x: number;
  y: number;
}

enum directionTypes {
  RIGHT = "RIGHT",
  LEFT = "LEFT",
  DOWN = "DOWN",
  UP = "UP"
}

enum modelEvents {
  SNAKE_MOVE = "SNAKE_MOVE",
  FOOD_GENERATED = "FOOD_GENERATED"
}

class Model {
  private ee = new EventEmitter();

  public snake: coords[];
  public food: coords;
  public direction = directionTypes.RIGHT;

  constructor(private width = 10, private height = 10) {
    this.snake = [
      {
        x: 5,
        y: 4
      },
      {
        x: 4,
        y: 4
      },
      {
        x: 3,
        y: 4
      }
    ];

    this.generateFood();
  }

  private get head(): coords {
    return this.snake[0];
  }

  moveSnake() {
    switch (this.direction) {
      case directionTypes.RIGHT:
        this.snake.unshift({ x: this.head.x + 1, y: this.head.y });
        break;

      case directionTypes.LEFT:
        this.snake.unshift({ x: this.head.x - 1, y: this.head.y });
        break;

      case directionTypes.DOWN:
        this.snake.unshift({ x: this.head.x, y: this.head.y + 1 });
        break;

      case directionTypes.UP:
        this.snake.unshift({ x: this.head.x, y: this.head.y - 1 });
        break;
    }

    // if out of frames render from opposite side
    if (this.head.x > this.width - 1) {
      this.head.x = 0;
    } else if (this.head.x < 0) {
      this.head.x = this.width - 1;
    }

    if (this.head.y > this.height - 1) {
      this.head.y = 0;
    } else if (this.head.y < 0) {
      this.head.y = this.height - 1;
    }

    const back = this.snake.pop();

    // if trapped on foud
    if (this.head.x === this.food.x && this.head.y === this.food.y) {
      this.snake.push(back);
      this.generateFood();
      this.ee.emit(modelEvents.FOOD_GENERATED, this.food);
    }

    this.ee.emit(modelEvents.SNAKE_MOVE, this.snake);
  }

  generateFood() {
    let x = _.random(9);
    let y = _.random(9);

    const snakeCollides = (): boolean => {
      return this.snake.some(coords => coords.x === x || coords.y === y);
    };

    while (snakeCollides()) {
      x = _.random(9);
      y = _.random(9);
    }

    this.food = {
      x,
      y
    };
  }

  onSnakeMove(fn: (snake: coords[]) => void) {
    this.ee.on(modelEvents.SNAKE_MOVE, fn);
  }

  onFoodGenerated(fn: (snake: coords) => void) {
    this.ee.on(modelEvents.FOOD_GENERATED, fn);
  }
}

enum viewEvents {
  KEYDOWN = "KEYDOWN"
}

class View {
  private ee = new EventEmitter();

  private app: HTMLElement = document.getElementById("app");
  private field: HTMLElement;

  constructor(private width = 10, private height = 10) {
    this.generateHTML();
    this.initEvents();
  }

  private generateHTML() {
    this.field = this.createElem("div", "field");

    for (let h = 0; h < this.width; h++) {
      for (let w = 0; w < this.width; w++) {
        const cell = this.createElem("div", "cell");

        cell.dataset.x = w.toString();
        cell.dataset.y = h.toString();

        cell.style.width = `${100 / this.width}%`;
        cell.style.height = `${100 / this.height}%`;

        this.field.append(cell);
      }
    }

    this.app.append(this.field);
  }

  private initEvents() {
    document.addEventListener("keydown", e => {
      this.ee.emit(viewEvents.KEYDOWN, e.code);
    });
  }

  get cells() {
    return [...this.field.children];
  }

  createElem(tagName: string, className: string) {
    const elem = document.createElement(tagName);
    elem.classList.add(className);

    return elem;
  }

  renderSnake(snake: coords[]) {
    const clearCells = this.field.querySelectorAll(".snake");

    clearCells.forEach(cell => cell.classList.remove("snake", "head"));

    const addCells = this.cells.filter(cell =>
      snake.some(
        coords =>
          coords.x === +(cell as HTMLElement).dataset.x &&
          coords.y === +(cell as HTMLElement).dataset.y
      )
    );

    addCells.forEach(cell => cell.classList.add("snake"));

    const head = this.cells.find(
      cell =>
        snake[0].x === +(cell as HTMLElement).dataset.x &&
        snake[0].y === +(cell as HTMLElement).dataset.y
    );

    head.classList.add("head");
  }

  renderFood(food: coords) {
    const clearCell = this.field.querySelector(".food");

    if (clearCell) {
      clearCell.classList.remove("food");
    }

    const addcell = this.cells.find(
      cell =>
        food.x === +(cell as HTMLElement).dataset.x &&
        food.y === +(cell as HTMLElement).dataset.y
    );

    if (addcell) {
      addcell.classList.add("food");
    }
  }

  onKeyDown(fn: (code: string) => void) {
    this.ee.on(viewEvents.KEYDOWN, fn);
  }
}

class Controller {
  private model: Model;
  private view: View;

  private paused = true;
  private iv: number;

  constructor(model: Model, view: View) {
    this.view = view;
    this.model = model;

    // initial render
    view.renderSnake(model.snake);
    view.renderFood(model.food);

    this.connect();
  }

  private connect() {
    this.model.onSnakeMove(snake => this.view.renderSnake(snake));
    this.model.onFoodGenerated(food => this.view.renderFood(food));
    this.view.onKeyDown(code => this.onKeyDown(code));
  }

  private startMove() {
    this.paused = false;

    this.model.moveSnake();

    this.iv = window.setInterval(() => {
      this.model.moveSnake();
    }, 300);
  }

  private stopMove() {
    this.paused = true;
    window.clearInterval(this.iv);
    this.iv = null;
  }

  private onKeyDown(code: string) {
    // Space is for toggling pause state
    if (!code.includes("Arrow") && !code.includes("Space")) {
      return;
    }

    switch (code) {
      case "Space":
        if (!this.paused) {
          this.stopMove();
          return;
        }
        break;
      case "ArrowRight":
        this.model.direction = directionTypes.RIGHT;
        break;
      case "ArrowLeft":
        this.model.direction = directionTypes.LEFT;
        break;
      case "ArrowDown":
        this.model.direction = directionTypes.DOWN;
        break;
      case "ArrowUp":
        this.model.direction = directionTypes.UP;
        break;
    }

    if (this.paused) {
      this.startMove();
    }
  }
}

new Controller(new Model(), new View());
