import django.template.context
from copy import copy

# Monkey-patch BaseContext.__copy__ to fix Python 3.14+ compatibility issue
# where super() does not allow attribute assignment.
def patched_copy(self):
    duplicate = django.template.context.BaseContext()
    duplicate.__class__ = self.__class__
    duplicate.__dict__ = copy(self.__dict__)
    duplicate.dicts = self.dicts[:]
    return duplicate

django.template.context.BaseContext.__copy__ = patched_copy

