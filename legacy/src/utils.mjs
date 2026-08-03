export class Vector2D {
    constructor(x=0, y=0) {
	this.x = x;
	this.y = y;
    }

    add(other) {
	return new Vector2D(this.x + other.x, this.y + other.y);
    }

    sub(other) {
	return new Vector2D(this.x - other.x, this.y - other.y);
    }

    div(other) {
	return new Vector2D(this.x / other.x, this.y / other.y);
    }

    mul(other) {
	return new Vector2D(this.x * other.x, this.y * other.y);
    }

    scale(scalar) {
	return new Vector2D(this.x * scalar, this.y * scalar);
    }

    // angle in radians
    rotateCW(angle) {
	return new Vector2D(
	    this.x * Math.cos(angle) + this.y * Math.sin(angle),
	    this.y * Math.cos(angle) - this.x * Math.sin(angle));
    }

    toArray() {
	return [this.x, this.y];
    }

    floor() {
	return new Vector2D(Math.floor(this.x), Math.floor(this.y));
    }

    ceil() {
	return new Vector2D(Math.ceil(this.x), Math.ceil(this.y));
    }
    
    round() {
	return new Vector2D(Math.round(this.x), Math.round(this.y));
    }

    isWithin(boxMin, boxMax) {
	return boxMin.x <= this.x && boxMax.x >= this.x && boxMin.y <= this.y && boxMax.y >= this.y;
    }
    
    interpolate(other, t) {
	return this.scale(1-t).add(other.scale(t));
    }
}

export class Vector3D {
    constructor(x=0, y=0, z=0) {
	this.x = x;
	this.y = y;
	this.z = z;
    }

    add(other) {
	return new Vector2D(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    sub(other) {
	return new Vector2D(this.x - other.x, this.y - other.y, this.z - other.z);
    }

    div(other) {
	return new Vector2D(this.x / other.x, this.y / other.y, this.z / other.z);
    }

    mul(other) {
	return new Vector2D(this.x * other.x, this.y * other.y, this.z * other.z);
    }

    scale(scalar) {
	return new Vector2D(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    // angle in radians
    rotateCW(angle) {
	return new Vector2D(
	    this.x * Math.cos(angle) + this.y * Math.sin(angle),
	    this.y * Math.cos(angle) - this.x * Math.sin(angle));
    }

    toArray() {
	return [this.x, this.y, this.z];
    }

    floor() {
	return new Vector3D(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }

    ceil() {
	return new Vector3D(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
    }

    round() {
	return new Vector3D(Math.round(this.x), Math.round(this.y), Math.round(this.z));
    }

    isWithin(boxMin, boxMax) {
	return boxMin.x <= this.x && boxMax.x >= this.x && boxMin.y <= this.y && boxMax.y >= this.y && boxMin.z <= this.z && boxMax.z >= this.z;
    }

    interpolate(other, t) {
	return this.scale(1-t).add(other.scale(t));
    }
}

export class Color {
    constructor(r=0, g=0, b=0) {
	this.r = r;
	this.g = g;
	this.b = b;
    }

    toArray() {
		return [this.r, this.g, this.b];
    }

    getHexString() {
		const rhex = (Math.floor(this.r * 255)).toString(16).padStart(2, '0');
		const ghex = (Math.floor(this.g * 255)).toString(16).padStart(2, '0');
		const bhex = (Math.floor(this.b * 255)).toString(16).padStart(2, '0');
		return `#${rhex}${ghex}${bhex}`;
    }

    getRGBInt() {
    	let val = Math.round(this.b * 255);
    	val += Math.round(this.g * 255) * 256;
    	val += Math.round(this.r * 255) * 256 * 256;
    	return val;
    }
    
    // returns either black or white depending on which has more contrast with this color
    // the returned color can then be used as a foreground color for text with this color as a background
    // implementation recommended by Web Content Accessibility Guideline - https://www.w3.org/TR/WCAG20/
    getContrastColor() {
	// compute luminance
	const L =
	      0.2126 * (this.r <= 0.03928 ? this.r / 12.92 : Math.pow((this.r + 0.055) / 1.055, 2.4)) +
	      0.7152 * (this.g <= 0.03928 ? this.g / 12.92 : Math.pow((this.g + 0.055) / 1.055, 2.4)) +
	      0.0722 * (this.b <= 0.03928 ? this.b / 12.92 : Math.pow((this.b + 0.055) / 1.055, 2.4));

	// compare luminance ratios
	if ( (L + 0.05) * (L + 0.05) > 0.0525 )
	    return new Color(0, 0, 0);
	else
	    return new Color(1, 1, 1);
    }
}

const colors = new Map();
colors.set("red",     new Color(1, 0, 0));
colors.set("green",   new Color(0, 1, 0));
colors.set("blue",    new Color(0, 0, 1));
colors.set("yellow",  new Color(1, 1, 0));
colors.set("magenta", new Color(1, 0, 1));
colors.set("cyan",    new Color(0, 1, 1));
colors.set("orange",  new Color(1, 0.65, 0));
colors.set("white",   new Color(1, 1, 1));
colors.set("black",   new Color(0, 0, 0));

const RGB_REGEX = /[rR][gG][bB]\(\s*(\d+),\s*(\d+),\s*(\d+)\)/;
const HEX_REGEX = /#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})|([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/;

export function parseColor(str) {
    str = str.trim().toLowerCase();
    
    if (colors.has(str))
	return colors.get(str);

	let r = 1, g = 1, b = 1;

    if (str.startsWith("rgb")) {
		const match = str.match(RGB_REGEX);
		if (match !== null) {
		    r = parseInt(match[1]) / 255;
		    g = parseInt(match[2]) / 255;
		    b = parseInt(match[3]) / 255;
		}
    } else if (str.startsWith('#')) {
    	const match = str.match(HEX_REGEX);
    	if (match !== null) {
    		const offset = match[0] ? 1 : 4;
			r = parseInt(match[0+offset], 16) / 255;
			g = parseInt(match[1+offset], 16) / 255;
			b = parseInt(match[2+offset], 16) / 255;
    	}
    }

    return new Color(r, g, b);
}

export function debounce(func, timeout=100) {
    let timer;
    return (...args) => {
	clearTimeout(timer);
	timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

export function throttle(callback, timeout) {
	let waiting = false;
	return function () {
		if (!waiting) {
			callback.apply(this, arguments);
			waiting = true;
			setTimeout(() => { waiting = false; }, timeout)
		}
	}
}
