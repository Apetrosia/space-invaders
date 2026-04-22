export default class InputHandler {
    constructor() {
        this.down = {};
        this.pressed = {};
        document.addEventListener("keydown", e => {
            this.down[e.code] = true;
        });
        document.addEventListener("keyup", e => {
            delete this.down[e.code];
            delete this.pressed[e.code];
        });
    }

    /**
     * Returns whether a key is pressed down
     * @param  {String} code the keycode to check
     * @return {boolean} the result from check
     */
    isDown(code) {
        return this.down[code];
    }

    /**
     * Return whether a key has been pressed
     * @param  {String} code the keycode to check
     * @return {boolean} the result from check
     */
    isPressed(code) {
        // if key is registered as pressed return false else if
        // key down for first time return true else return false
        if (this.pressed[code]) {
            return false;
        } else if (this.down[code]) {
            return this.pressed[code] = true;
        }
        return false;
    }
}
