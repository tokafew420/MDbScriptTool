(function (CodeMirror) {
    'use strict';

    // A CodeMirror helper to find BEGIN/END blocks that are foldable
    CodeMirror.registerHelper('fold', 'tsql', function (cm, start) {
        let startLineNo = start.line;
        let startLine = cm.getLine(startLineNo).toLowerCase();
        let tokenType;

        function findOpening(token, len) {
            // Start from end
            let at = startLine.length;

            for (; ;) {
                var idx = startLine.lastIndexOf(token, at - len);
                if (idx === -1) {
                    return -1;
                }
                tokenType = cm.getTokenTypeAt(CodeMirror.Pos(startLineNo, idx + len));

                if (!/^(comment|string)/.test(tokenType)) {
                    // Add length so fold shows first keyword
                    return idx + len;
                } else if (!at) {
                    // Edge case when token is found at beginning of line but is a comment or string
                    return -1;
                }
                at = idx;
            }
        }

        let startIdx = findOpening('begin', 5);
        if (startIdx === -1) {
            startIdx = findOpening('case', 4);
        }

        if (startIdx === -1) return;
        let count = 1;
        let lastLineNo = cm.lastLine();
        let endLineNo = -1;
        let endIdx;

        outer: for (var i = startLineNo; i <= lastLineNo; ++i) {
            let text = cm.getLine(i).toLowerCase();
            let len = text.length;
            let pos = i === startLineNo ? startIdx : 0;

            for (; ;) {
                let nextOpen = text.indexOf('begin', pos);
                let nextClose = text.indexOf('end', pos);

                if (nextOpen === -1) {
                    nextOpen = text.indexOf('case', pos);
                    if (nextOpen === -1) {
                        nextOpen = len;
                    }
                }
                if (nextClose === -1) nextClose = len;

                pos = Math.min(nextOpen, nextClose);

                if (pos === len) break;

                if (cm.getTokenTypeAt(CodeMirror.Pos(i, pos + 3)) === tokenType) {
                    if (pos === nextOpen) {
                        ++count;
                    } else if (!--count) {
                        endLineNo = i;
                        endIdx = pos;
                        break outer;
                    }
                }
                ++pos;
            }
        }
        // If not found or on same line then no fold
        if (endLineNo === -1 || startLineNo === endLineNo) return;

        return {
            from: CodeMirror.Pos(startLineNo, startIdx),
            to: CodeMirror.Pos(endLineNo, endIdx)
        };
    });

    // A CodeMirror helper to find single line comments that are foldable
    CodeMirror.registerHelper('fold', 'linecomment', function (cm, start) {
        let startLineNo = start.line;
        let startLine = cm.getLine(startLineNo);

        function lineCommentStart(lineno, line) {
            let match = line && line.match(/^\s*--/);

            if (match) {
                let idx = line.indexOf('--', 0);
                if (/comment/.test(cm.getTokenTypeAt(CodeMirror.Pos(lineno, idx + 1)))) {
                    return idx;
                }

            }
            return -1;
        }

        let startIdx = lineCommentStart(startLineNo, startLine);
        if (startIdx === -1) return;

        // Skip lines that follow a previous line comment on same column
        if (startLineNo > 0) {
            let preIdx = lineCommentStart(startLineNo - 1, cm.getLine(startLineNo - 1));
            if (startIdx === preIdx) return;
        }

        let lastLineNo = cm.lastLine();
        let endLineNo, endLine;

        for (let i = startLineNo + 1; i <= lastLineNo; ++i) {
            endLine = cm.getLine(i);
            let pos = lineCommentStart(i, endLine);

            // Only fold single line comments that start at the same column
            if (pos === startIdx) {
                endLineNo = i;
            } else {
                break;
            }
        }
        // If not found or on same line then no fold
        if (!endLineNo || startLineNo === endLineNo) return;

        return {
            from: CodeMirror.Pos(startLineNo, startLine.length),
            to: CodeMirror.Pos(endLineNo, cm.getLine(endLineNo).length)
        };
    });
})(CodeMirror);
