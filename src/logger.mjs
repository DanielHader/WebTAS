
const MONTH_TABLE = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export class Logger {

    static INFO = 'INFO';
    static ERROR = 'ERROR';
    static WARNING = 'WARNING';
    
    static messages = [];
    static logDom;

    static init(logDOM) {
		this.messages = [];
		this.logDOM = logDOM;
    }

    static log(type, message) {
		const date = new Date();
		Logger.messages.push({type: type, message: message, date: date});

		const messageDOM = document.createElement('div');
		const entryType = document.createElement('div');
		const entryMsg = document.createElement('div');
		const entryDate = document.createElement('div');
		
		messageDOM.classList.add('log-entry', 'w3-small', 'w3-container', 'w3-leftbar', 'w3-rightbar', 'w3-border-bottom', 'w3-monospace');
		entryType.classList.add('log-type');
		entryMsg.classList.add('log-message', 'w3-border-left', 'w3-border-right');
		entryDate.classList.add('log-date');
		if (type === Logger.ERROR) {
		    messageDOM.classList.add('w3-pale-red', 'w3-border-red');
		} else if (type === Logger.WARNING) {
		    messageDOM.classList.add('w3-pale-yellow', 'w3-border-yellow');
		} else {
		    messageDOM.classList.add('w3-light-gray', 'w3-border-gray');
		}

		const timeStr = `${String(date.getHours()).padStart(2,0)}:${String(date.getMinutes()).padStart(2,0)}:${String(date.getSeconds()).padStart(2,0)}`;
		const dateStr = `${String(date.getDay()).padStart(2,0)}/${String(date.getMonth()).padStart(2,0)}/${date.getFullYear()}`;

		entryType.appendChild(document.createTextNode(type));
		entryMsg.appendChild(document.createTextNode(message));
		entryDate.appendChild(document.createTextNode(timeStr + '  ' + dateStr));
		messageDOM.appendChild(entryType);
		messageDOM.appendChild(entryMsg);
		messageDOM.appendChild(entryDate);
		if (Logger.logDOM !== undefined) {
			Logger.logDOM.appendChild(messageDOM);
			Logger.logDOM.scrollTop = Logger.logDOM.scrollHeight;
		}
    }
}
