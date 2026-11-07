import importlib.util
import os
from pathlib import Path
import socket
import threading
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("broker_proxy", Path(__file__).with_name("broker_ssh_proxy.py"))
proxy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(proxy)


class BrokerProxyTests(unittest.TestCase):
    def test_only_exact_fixed_command_is_accepted(self):
        proxy.validate_command("proxy-frontend-v1")
        for value in ["", "id", "proxy-frontend-v1 ", "proxy-frontend-v1; id", "proxy-frontend-v1 other-host 22", "proxy-backend-v1"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                proxy.validate_command(value)

    def test_fixed_destination_and_no_connection_for_invalid_command(self):
        self.assertEqual(proxy.DESTINATION, ("136.108.97.182", 22))
        with patch.dict(os.environ, {"SSH_ORIGINAL_COMMAND": "id"}), patch.object(proxy.socket, "create_connection") as connect:
            with self.assertRaises(ValueError):
                proxy.main()
            connect.assert_not_called()

    @unittest.skipIf(os.name == "nt", "POSIX descriptors are required by the installed SSH relay")
    def test_bidirectional_bytes_and_half_close(self):
        relay_end, server_end = socket.socketpair()
        read_input, write_input = os.pipe()
        read_output, write_output = os.pipe()
        errors = []
        def run():
            try:
                proxy.relay(relay_end, read_input, write_output)
            except BaseException as exc:
                errors.append(exc)
        thread = threading.Thread(target=run)
        thread.start()
        try:
            request = b"SSH-2.0-probe\r\n\x00\xff"
            os.write(write_input, request)
            server_end.settimeout(2)
            self.assertEqual(server_end.recv(1024), request)
            os.close(write_input)
            write_input = None
            self.assertEqual(server_end.recv(1024), b"")
            response = b"SSH-2.0-target\r\n\x80"
            server_end.sendall(response)
            self.assertEqual(os.read(read_output, 1024), response)
            server_end.close()
            thread.join(2)
            self.assertFalse(thread.is_alive())
            self.assertEqual(errors, [])
        finally:
            relay_end.close()
            server_end.close()
            for fd in [read_input, write_input, read_output, write_output]:
                if fd is not None:
                    os.close(fd)

    def test_expired_deadline_stops_before_reading(self):
        moments = iter([0, proxy.MAX_SECONDS + 1])
        with self.assertRaises(TimeoutError):
            proxy.relay(None, clock=lambda: next(moments))


if __name__ == "__main__":
    unittest.main()
