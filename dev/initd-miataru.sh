#! /bin/sh
### BEGIN INIT INFO
# Provides:          miataru
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: miataru service
# Description:       miataru location service init.d script for debian systems.
### END INIT INFO

# Author: Georg Peters <georgpeters811+miataru@gmail.com>
# Install:
# apt-get install screen
# cp init script to /etc/init.d/miataru
# chmod +x /etc/init.d/miataru
# chown root:root /etc/init.d/miataru
# update-rc.d miataru defaults

PATH=/sbin:/usr/sbin:/bin:/usr/bin:/usr/local/sbin:/usr/local/bin
SCRIPT_PATH=/home/xbmc/miataru-server/server.js

case "$1" in
  start)
    screen -AmdS miataru nodejs $SCRIPT_PATH
    echo "Server started on screen miataru"
    ;;
  stop)
    screen -X -S miataru kill
    echo "Server shutting down"
    ;;
  restart)
    screen -X -S miataru kill
    screen -AmdS miataru nodejs $SCRIPT_PATH
    echo "Server restarted"
    ;;
  *)
    echo "Usage: /etc/init.d/miataru {start|stop|restart}"
    exit 1
    ;;
esac

exit 0