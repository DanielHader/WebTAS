import os
from http.server import HTTPServer, CGIHTTPRequestHandler

def main(port):
    os.chdir('.')
    server_object = HTTPServer(server_address=('', port), RequestHandlerClass=CGIHTTPRequestHandler)
    try:
        print(f'Web server starting on port {port}.')
        server_object.serve_forever()
    except KeyboardInterrupt:
        server_object.socket.close()
        print('Web server exiting.')

if __name__ == '__main__':
    main(8000)

