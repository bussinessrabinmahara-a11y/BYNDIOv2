
import sys

def check_braces(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        stack = []
        for line_num, line in enumerate(f, 1):
            for char_num, char in enumerate(line, 1):
                if char == '{':
                    stack.append((line_num, char_num))
                elif char == '}':
                    if not stack:
                        print(f"Extra closing brace at line {line_num}, char {char_num}")
                    else:
                        stack.pop()
        
        if stack:
            print("Unclosed braces:")
            for l, c in stack:
                print(f"  Line {l}, char {c}")
        else:
            print("Braces are balanced")

if __name__ == "__main__":
    check_braces(sys.argv[1])
