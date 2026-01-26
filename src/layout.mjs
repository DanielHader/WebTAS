
document.addEventListener('DOMContentLoaded', () => {
	Split({
		rowGutters: [{
			track: 1,
			element: document.getElementById("editor-gutter")
		},{
			track: 3,
			element: document.getElementById("log-gutter")
		}],
		columnGutters: [{
			track: 1,
			element: document.getElementById("simulator-gutter")
		}]
	})
});

